import {
  PRONUNCIATION_BYTES_MAX,
  PRONUNCIATION_SHOWN_FROM,
  pronunciationAssessmentSchema,
  pronunciationQuerySchema,
  type PronunciationFinding,
} from '@kuhedu/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { isWav, WAV_TYPES } from '../../lib/wav.ts'
import { HttpError } from '../../plugins/errors.ts'
import { requireVerified } from '../../plugins/session.ts'
import { UnreadableRecording, type Scorer, type ScorerFinding } from './scorer.ts'

export type PronunciationRoutesOptions = {
  scorer: Scorer
  /** Recordings one learner may have checked in a minute. */
  requestsPerMinute: number
  logError: (error: unknown) => void
}

/** A word as a learner reads it, without the comma or full stop that follows it in a sentence. */
const strippedOfMarks = (word: string) =>
  word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').slice(0, 40)

/**
 * A word as it is compared: its letters, whatever its capitals and the marks in and around it
 * ("I’m" and "i'm" and "im" are one word here: the scorer and a lesson do not write it alike).
 */
const plain = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * What a learner is told, out of everything the scorer found: nothing heard, or the corrections
 * it is sure enough of, or that there was nothing to correct. A count of parts and the number of
 * the strong part go with their finding. Which sound was heard as which does not: the scorer
 * writes those in phonetic letters, which is not something to show a learner.
 *
 * **In something of several words, a sound that differed goes with the words it was in**: a
 * learner can do something with "meet", and nothing with "a sound". Only words of what was to be
 * said are passed on, as it writes them. And **a sentence's parts are not counted**: that is a
 * count of every vowel in it by a recogniser that mishears some, and "seven parts, not six" is
 * nothing a learner can act on. A word or phrase whose parts a lesson wrote out is still counted.
 */
export function findingsToShow(
  found: ScorerFinding[],
  said: { word: string; parts?: string },
): PronunciationFinding[] {
  const nothing = found.find((finding) => finding.code === 'nothingHeard')
  if (nothing) return [{ code: 'nothingHeard', confidence: nothing.confidence }]

  const written = said.word.split(/\s+/).filter((word) => plain(word) !== '')
  const severalWords = written.length > 1
  const countsParts = !severalWords || said.parts !== undefined
  const differed = new Set<string>()

  const corrections = found.filter(
    ({ code }) =>
      code !== 'ok' && (countsParts || (code !== 'extraSyllable' && code !== 'missingSyllable')),
  )
  const shown: PronunciationFinding[] = []
  for (const { code, confidence, expected, heard, word } of corrections) {
    if (confidence < PRONUNCIATION_SHOWN_FROM) continue
    // Several sounds that differ are one thing to say: listen again and compare.
    const before = shown.find((finding) => finding.code === code)
    if (code === 'soundDiffers') {
      if (word) differed.add(plain(word))
      if (before) before.confidence = Math.max(before.confidence, confidence)
      else shown.push({ code, confidence })
    } else if (!before) {
      shown.push({
        code,
        confidence,
        ...(typeof expected === 'number' && { expected }),
        ...(typeof heard === 'number' && { heard }),
      })
    }
  }

  // In the order of the sentence, each once, and without the marks beside it.
  const words = severalWords
    ? [...new Set(written.filter((word) => differed.has(plain(word))).map(strippedOfMarks))]
    : []
  const sounds = shown.find((finding) => finding.code === 'soundDiffers')
  if (sounds && words.length > 0) sounds.words = words.slice(0, 12)
  if (shown.length > 0) return shown

  // Nothing sure enough to say. How sure that is, is what the surest doubt leaves.
  const doubt = Math.max(0, ...corrections.map((finding) => finding.confidence))
  return [{ code: 'ok', confidence: Math.round((1 - doubt) * 1000) / 1000 }]
}

/**
 * `/api/pronunciation/*`: a learner's recording of a word, checked. Theirs, so only for an account
 * whose address is verified.
 *
 * **A recording is a person's voice.** It is held in memory for as long as the scorer takes, and
 * then let go: it is not written to disk, not kept with the account, not logged, and nothing is
 * recorded about what was found.
 */
export const pronunciationRoutes: FastifyPluginAsyncZod<PronunciationRoutesOptions> = async (
  app,
  options,
) => {
  const { scorer, requestsPerMinute, logError } = options

  // The recording is the request's body, kept as it came.
  app.addContentTypeParser(
    WAV_TYPES,
    { parseAs: 'buffer', bodyLimit: PRONUNCIATION_BYTES_MAX },
    (_request, body, done) => done(null, body),
  )

  app.post(
    '/assessments',
    {
      preHandler: requireVerified,
      bodyLimit: PRONUNCIATION_BYTES_MAX,
      config: {
        rateLimit: {
          max: requestsPerMinute,
          timeWindow: '1 minute',
          // By the learner where there is one: a classroom may share an address.
          keyGenerator: (request) => request.user?.id ?? request.ip,
        },
      },
      schema: {
        querystring: pronunciationQuerySchema,
        response: { 200: pronunciationAssessmentSchema },
      },
    },
    async (request) => {
      const recording = request.body
      if (!isWav(recording)) {
        throw new HttpError(400, 'validation_failed', 'The recording must be sent as a WAV')
      }

      let found: ScorerFinding[]
      try {
        found = await scorer.assess(recording, request.query)
      } catch (error) {
        if (error instanceof UnreadableRecording) {
          throw new HttpError(400, 'validation_failed', 'The recording could not be read')
        }
        logError(error)
        throw new HttpError(503, 'unavailable', 'The scoring service is not answering')
      }
      return { findings: findingsToShow(found, request.query) }
    },
  )
}
