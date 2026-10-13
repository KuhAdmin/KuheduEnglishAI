import { z } from 'zod'

/**
 * A learner's spoken reply in a role-play, checked by the server: the app sends the recording
 * and the line it answers, and gets back what was heard and two things about it. The server
 * never answers in sentences of its own: what a learner reads about their reply is a stored
 * text in their language. The two English sentences it does send are the learner's own words,
 * as heard and as they could be said, which are English to practise.
 *
 * The recording is the request's body (`audio/wav`); the line it answers is in the address.
 */

/** The longest reply that is checked. A turn of a role-play is a sentence or two. */
export const REPLY_SECONDS_MAX = 30
/** What the recording is sent as: one channel, 16 bits, at the rate the recogniser listens at. */
export const REPLY_SAMPLE_RATE = 16_000
/** The most a recording of that length weighs, with room for its header. */
export const REPLY_BYTES_MAX = REPLY_SECONDS_MAX * REPLY_SAMPLE_RATE * 2 + 1024
/** The longest line that is judged or answered with: a line of a lesson is far shorter. */
export const REPLY_TEXT_MAX = 400

/** `POST /api/conversation/replies?partner=…&suggested=…`, with the recording as its body. */
export const replyQuerySchema = z.object({
  /** What the partner said, which the learner is answering. */
  partner: z.string().trim().min(1).max(REPLY_TEXT_MAX),
  /** The reply the lesson suggests. Saying just that is right without anything being asked. */
  suggested: z
    .string()
    .trim()
    .max(REPLY_TEXT_MAX)
    .optional()
    .transform((suggested) => suggested || undefined),
})

export type ReplyQuery = z.infer<typeof replyQuerySchema>

export const replyAssessmentSchema = z.object({
  /**
   * The learner's words as the recogniser wrote them, or `null` when it heard none it was sure
   * of. It writes what it takes the speaker to mean, so it can be wrong, and tidier than what
   * was said.
   */
  heard: z.string().min(1).max(REPLY_TEXT_MAX).nullable(),
  /** Whether that answers what the partner said. `null` when nothing was heard. */
  fits: z.boolean().nullable(),
  /** The same sentence as correct English, when that differs from what was heard. */
  better: z.string().min(1).max(REPLY_TEXT_MAX).nullable(),
})

export type ReplyAssessment = z.infer<typeof replyAssessmentSchema>
