import {
  apiErrorSchema,
  PRONUNCIATION_BYTES_MAX,
  pronunciationAssessmentSchema,
  type PronunciationQuery,
  type SessionUser,
} from '@kuhedu/contracts'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, describe, expect, it } from 'vitest'
import { findingsToShow, pronunciationRoutes } from '../src/modules/pronunciation/routes.ts'
import {
  UnreadableRecording,
  type Scorer,
  type ScorerFinding,
} from '../src/modules/pronunciation/scorer.ts'
import { registerErrorHandling } from '../src/plugins/errors.ts'
import { registerSecurity } from '../src/plugins/security.ts'

const learner: SessionUser = {
  id: 'learner-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

/** A recording as the app sends it: enough of a WAV to be taken for one. */
const wav = (bytes = 2000) => {
  const recording = Buffer.alloc(bytes)
  recording.write('RIFF', 0, 'latin1')
  recording.write('WAVE', 8, 'latin1')
  return recording
}

/** A scoring service that judges nothing, remembers what it was asked, and can be switched off. */
function fakeScorer(findings: ScorerFinding[] = [{ code: 'ok', confidence: 1 }]) {
  const state = {
    asked: [] as { bytes: number; said: PronunciationQuery }[],
    fails: null as Error | null,
    findings,
  }
  const scorer: Scorer = {
    assess: async (recording, said) => {
      if (state.fails) throw state.fails
      state.asked.push({ bytes: recording.length, said })
      return state.findings
    },
  }
  return { scorer, state }
}

let app: FastifyInstance | undefined

/**
 * The routes with someone signed in, or nobody. The cookie that says who (`plugins/session.ts`)
 * needs the database; here a stand-in says it, so that these need none.
 */
function start(scorer: Scorer, user: SessionUser | null = learner, requestsPerMinute = 100) {
  const server = Fastify().withTypeProvider<ZodTypeProvider>()
  server.setValidatorCompiler(validatorCompiler)
  server.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(server)
  registerSecurity(server)
  server.decorateRequest('user', null)
  server.addHook('onRequest', async (request) => {
    request.user = user
  })
  void server.register(pronunciationRoutes, {
    prefix: '/api/pronunciation',
    scorer,
    requestsPerMinute,
    logError: () => {},
  })
  app = server
  return server
}

const check = (
  query = 'word=Wednesday&parts=We(d)n(e)s-day&stress=1',
  recording: Buffer = wav(),
) => ({
  method: 'POST' as const,
  url: `/api/pronunciation/assessments?${query}`,
  headers: { 'content-type': 'audio/wav' },
  payload: recording,
})

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('POST /api/pronunciation/assessments', () => {
  it('has the recording judged against what was to be said, and answers with what was found', async () => {
    const { scorer, state } = fakeScorer([
      { code: 'extraSyllable', confidence: 0.54, expected: 2, heard: 3 },
    ])

    const response = await start(scorer).inject(check())

    expect(response.statusCode).toBe(200)
    expect(pronunciationAssessmentSchema.parse(response.json()).findings).toEqual([
      { code: 'extraSyllable', confidence: 0.54, expected: 2, heard: 3 },
    ])
    expect(state.asked).toEqual([
      { bytes: 2000, said: { word: 'Wednesday', parts: 'We(d)n(e)s-day', stress: 1 } },
    ])
    // About one person at one moment: nothing between here and the app keeps it.
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('needs only the word', async () => {
    const { scorer, state } = fakeScorer()

    const response = await start(scorer).inject(check('word=hello'))

    expect(response.json()).toEqual({ findings: [{ code: 'ok', confidence: 1 }] })
    expect(state.asked[0]?.said).toEqual({ word: 'hello' })
  })

  it('is for a learner who is signed in, with a verified address', async () => {
    const { scorer, state } = fakeScorer()

    const nobody = await start(scorer, null).inject(check())
    expect(nobody.statusCode).toBe(401)
    expect(apiErrorSchema.parse(nobody.json()).error.code).toBe('unauthenticated')
    await app?.close()

    const unfinished = await start(scorer, { ...learner, emailVerified: false }).inject(check())
    expect(unfinished.statusCode).toBe(403)
    expect(apiErrorSchema.parse(unfinished.json()).error.code).toBe('forbidden')
    expect(state.asked).toEqual([])
  })

  it('turns away a request from another site', async () => {
    const { scorer, state } = fakeScorer()
    const request = check()

    const response = await start(scorer).inject({
      ...request,
      headers: { ...request.headers, origin: 'https://elsewhere.example' },
    })

    expect(response.statusCode).toBe(403)
    expect(state.asked).toEqual([])
  })

  it.each([
    ['something that is not a WAV', check('word=hello', Buffer.from('a'.repeat(200))), 400],
    ['a recording too short to be one', check('word=hello', wav(20)), 400],
    ['a recording too large', check('word=hello', wav(PRONUNCIATION_BYTES_MAX + 1)), 413],
    ['no word', check(''), 400],
    ['a word too long', check(`word=${'x'.repeat(201)}`), 400],
    ['a strong part that is no number', check('word=hello&stress=first'), 400],
    [
      'a recording sent as something else',
      { ...check('word=hello'), headers: { 'content-type': 'application/json' }, payload: '{}' },
      400,
    ],
  ])('refuses %s, and has nothing judged', async (_, request, status) => {
    const { scorer, state } = fakeScorer()

    const response = await start(scorer).inject(request)

    expect(response.statusCode).toBe(status)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('validation_failed')
    expect(state.asked).toEqual([])
  })

  it('says so when the scorer could not read the recording', async () => {
    const { scorer, state } = fakeScorer()
    state.fails = new UnreadableRecording('The scoring service answered 422')

    const response = await start(scorer).inject(check())

    expect(response.statusCode).toBe(400)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('validation_failed')
  })

  it('is unavailable, not broken, when the scoring service does not answer', async () => {
    const { scorer, state } = fakeScorer()
    state.fails = new Error('connect ECONNREFUSED 127.0.0.1:8789')

    const response = await start(scorer).inject(check())

    expect(response.statusCode).toBe(503)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('unavailable')
    // What went wrong inside is for the log, not for the caller.
    expect(response.body).not.toContain('ECONNREFUSED')
  })

  it('turns away a learner who asks for more than their share', async () => {
    const server = start(fakeScorer().scorer, learner, 2)

    await server.inject(check())
    await server.inject(check())
    const third = await server.inject(check())

    expect(third.statusCode).toBe(429)
    expect(apiErrorSchema.parse(third.json()).error.code).toBe('rate_limited')
  })
})

describe('what a learner is told of what the scorer found', () => {
  const aWord = { word: 'Wednesday', parts: 'We(d)n(e)s-day' }

  it('is not told a suspicion the scorer is barely sure of', () => {
    // A right "hello": the scorer is 7% sure its stress moved.
    expect(
      findingsToShow([{ code: 'stressMoved', confidence: 0.07, expected: 2, heard: 1 }], aWord),
    ).toEqual([{ code: 'ok', confidence: 0.93 }])
    expect(findingsToShow([{ code: 'ok', confidence: 1 }], aWord)).toEqual([
      { code: 'ok', confidence: 1 },
    ])
  })

  it('is told what it is sure enough of, with the numbers that go with it', () => {
    expect(
      findingsToShow(
        [
          { code: 'extraSyllable', confidence: 0.54, expected: 2, heard: 3 },
          { code: 'stressMoved', confidence: 0.8, expected: 1, heard: 2 },
          { code: 'missingSyllable', confidence: 0.49, expected: 3, heard: 2 },
        ],
        aWord,
      ),
    ).toEqual([
      { code: 'extraSyllable', confidence: 0.54, expected: 2, heard: 3 },
      { code: 'stressMoved', confidence: 0.8, expected: 1, heard: 2 },
    ])
  })

  it('is told once that a sound differed, and never in phonetic letters', () => {
    expect(
      findingsToShow(
        [
          { code: 'soundDiffers', confidence: 0.6, expected: 'z', heard: 's', word: 'wednesday' },
          { code: 'soundDiffers', confidence: 1, expected: 'eɪ', heard: 'e' },
          { code: 'soundDiffers', confidence: 0.13, expected: 'ɛ', heard: 'e' },
        ],
        aWord,
      ),
      // One word is the whole of it: naming it would say nothing.
    ).toEqual([{ code: 'soundDiffers', confidence: 1 }])
  })

  it('is told only that nothing was heard, when nothing was', () => {
    expect(
      findingsToShow(
        [
          { code: 'nothingHeard', confidence: 1 },
          { code: 'missingSyllable', confidence: 0.9, expected: 2, heard: 0 },
        ],
        aWord,
      ),
    ).toEqual([{ code: 'nothingHeard', confidence: 1 }])
  })

  describe('of a sentence', () => {
    const aSentence = { word: 'I’m fine, thank you. And you?' }

    it('is told which of its words sounded different, as the sentence writes them and in its order', () => {
      expect(
        findingsToShow(
          [
            { code: 'soundDiffers', confidence: 0.7, expected: 'θ', heard: 't', word: 'thank' },
            { code: 'soundDiffers', confidence: 0.9, expected: 'aɪ', heard: 'a', word: "i'm" },
            { code: 'soundDiffers', confidence: 0.6, expected: 'æ', heard: 'ɛ', word: 'thank' },
            // Not sure enough to be told, so its word is not named either.
            { code: 'soundDiffers', confidence: 0.2, expected: 'f', heard: 'p', word: 'fine' },
          ],
          aSentence,
        ),
      ).toEqual([{ code: 'soundDiffers', confidence: 0.9, words: ['I’m', 'thank'] }])
    })

    it('names a word once however often it comes, and never a word the sentence does not have', () => {
      expect(
        findingsToShow(
          [
            { code: 'soundDiffers', confidence: 0.8, expected: 'j', heard: 'dʒ', word: 'you' },
            { code: 'soundDiffers', confidence: 0.8, expected: 'x', heard: 'y', word: 'elsewhere' },
          ],
          aSentence,
        ),
      ).toEqual([{ code: 'soundDiffers', confidence: 0.8, words: ['you'] }])

      // With no word of the sentence to name, it is told as for a single word.
      expect(
        findingsToShow(
          [{ code: 'soundDiffers', confidence: 0.8, expected: 'x', heard: 'y', word: 'elsewhere' }],
          aSentence,
        ),
      ).toEqual([{ code: 'soundDiffers', confidence: 0.8 }])
    })

    it('is not told a count of its parts, which is every vowel in it', () => {
      expect(
        findingsToShow(
          [{ code: 'extraSyllable', confidence: 0.9, expected: 7, heard: 8 }],
          aSentence,
        ),
      ).toEqual([{ code: 'ok', confidence: 1 }])
    })

    it('is told the parts of a phrase whose parts a lesson wrote out', () => {
      const aPhrase = { word: 'nice to meet you', parts: 'nic(e)-to-meet-you' }

      expect(
        findingsToShow(
          [
            { code: 'extraSyllable', confidence: 0.9, expected: 4, heard: 5 },
            { code: 'soundDiffers', confidence: 0.8, expected: 'i', heard: 'ɪ', word: 'meet' },
          ],
          aPhrase,
        ),
      ).toEqual([
        { code: 'extraSyllable', confidence: 0.9, expected: 4, heard: 5 },
        { code: 'soundDiffers', confidence: 0.8, words: ['meet'] },
      ])
    })
  })
})
