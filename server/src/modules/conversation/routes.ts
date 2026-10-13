import {
  REPLY_BYTES_MAX,
  REPLY_TEXT_MAX,
  replyAssessmentSchema,
  replyQuerySchema,
  type ReplyAssessment,
} from '@kuhedu/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { isWav, WAV_TYPES } from '../../lib/wav.ts'
import { HttpError } from '../../plugins/errors.ts'
import { requireVerified } from '../../plugins/session.ts'
import { UnreadableRecording } from '../pronunciation/scorer.ts'
import type { Grader } from './grader.ts'
import type { Listener } from './listener.ts'
import { sameWords, stillTheirs, wordsOf } from './words.ts'

export type ConversationRoutesOptions = {
  listener: Listener
  grader: Grader
  /** Replies one learner may have checked in a minute. */
  requestsPerMinute: number
  logError: (error: unknown) => void
}

/** A sentence as it is sent on: on one line, and no longer than a line may be. */
const tidy = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, REPLY_TEXT_MAX)

/**
 * What is said of a reply that was heard: whether it answers the partner, and a better way to
 * say it where there is one.
 *
 * - **The suggested reply itself is right**, and nothing is asked about it.
 * - **A better sentence is shown only if it is still the learner's** (`stillTheirs`): the model
 *   sometimes answers a sentence instead of correcting it, or "corrects" a name. One word has no
 *   grammar to correct.
 * - **Whether it answers is asked of the corrected sentence**: asked of the sentence as it was
 *   said, a grammar slip was taken for a wrong answer, which is the costly mistake to make.
 */
export async function judgeReply(
  grader: Grader,
  { partner, suggested, heard }: { partner: string; suggested?: string; heard: string },
): Promise<Pick<ReplyAssessment, 'fits' | 'better'>> {
  if (suggested && sameWords(heard, suggested)) return { fits: true, better: null }

  let better: string | null = null
  if (wordsOf(heard).length > 1) {
    const rewrite = tidy(await grader.rewrite(heard))
    if (rewrite && !sameWords(rewrite, heard) && stillTheirs(heard, rewrite)) better = rewrite
  }
  return { fits: await grader.answers(partner, better ?? heard), better }
}

/**
 * `/api/conversation/*`: what a learner said in a role-play, checked. Theirs, so only for an
 * account whose address is verified.
 *
 * **A recording is a person's voice, and so are their words.** Both are held in memory for as
 * long as judging takes and then let go: nothing is written to disk, kept with the account or
 * logged, and nothing is recorded of what was found.
 */
export const conversationRoutes: FastifyPluginAsyncZod<ConversationRoutesOptions> = async (
  app,
  options,
) => {
  const { listener, grader, requestsPerMinute, logError } = options

  // The recording is the request's body, kept as it came.
  app.addContentTypeParser(
    WAV_TYPES,
    { parseAs: 'buffer', bodyLimit: REPLY_BYTES_MAX },
    (_request, body, done) => done(null, body),
  )

  app.post(
    '/replies',
    {
      preHandler: requireVerified,
      bodyLimit: REPLY_BYTES_MAX,
      config: {
        rateLimit: {
          max: requestsPerMinute,
          timeWindow: '1 minute',
          // By the learner where there is one: a classroom may share an address.
          keyGenerator: (request) => request.user?.id ?? request.ip,
        },
      },
      schema: {
        querystring: replyQuerySchema,
        response: { 200: replyAssessmentSchema },
      },
    },
    async (request) => {
      const recording = request.body
      if (!isWav(recording)) {
        throw new HttpError(400, 'validation_failed', 'The recording must be sent as a WAV')
      }

      let written: string | null
      try {
        written = await listener.write(recording)
      } catch (error) {
        if (error instanceof UnreadableRecording) {
          throw new HttpError(400, 'validation_failed', 'The recording could not be read')
        }
        logError(error)
        throw new HttpError(503, 'unavailable', 'The scoring service is not answering')
      }
      const heard = written && tidy(written)
      if (!heard) return { heard: null, fits: null, better: null }

      try {
        return { heard, ...(await judgeReply(grader, { ...request.query, heard })) }
      } catch (error) {
        // The cause, never the learner's words.
        logError(error)
        throw new HttpError(503, 'unavailable', 'The grading service is not answering')
      }
    },
  )
}
