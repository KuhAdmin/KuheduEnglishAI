import { z } from 'zod'

/**
 * A learner's recording of one word, checked by the server: the app sends the recording and what
 * was to be said, and gets back findings as codes. The server answers in codes, never in
 * sentences, so that what a learner reads is a stored text in their own language.
 *
 * The recording is the request's body (`audio/wav`); what was to be said is in the address.
 */

/** The longest recording that is checked. A word, or a few said together, is a few seconds. */
export const PRONUNCIATION_SECONDS_MAX = 15
/** What the recording is sent as: one channel, 16 bits, at the rate the recogniser listens at. */
export const PRONUNCIATION_SAMPLE_RATE = 16_000
/** The most a recording of that length weighs, with room for its header. */
export const PRONUNCIATION_BYTES_MAX =
  PRONUNCIATION_SECONDS_MAX * PRONUNCIATION_SAMPLE_RATE * 2 + 1024

/**
 * A finding is shown only at this confidence or above. **An untuned guess**: nothing has measured
 * the scorer on learners' recordings yet. It is here so that the scorer's faintest suspicions
 * (a stress it is 7% sure moved) are not told to a learner as corrections.
 */
export const PRONUNCIATION_SHOWN_FROM = 0.5

export const PRONUNCIATION_CODES = [
  'ok',
  'nothingHeard',
  'extraSyllable',
  'missingSyllable',
  'stressMoved',
  'soundDiffers',
] as const

export type PronunciationCode = (typeof PRONUNCIATION_CODES)[number]

/** `POST /api/pronunciation/assessments?word=…&parts=…&stress=…`, with the recording as its body. */
export const pronunciationQuerySchema = z.object({
  /** What was to be said, as it is written: a word, or a sentence of a lesson. */
  word: z.string().trim().min(1).max(200),
  /** The word in the parts it is said in, as a lesson writes them: "We(d)n(e)s-day". */
  parts: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((parts) => parts || undefined),
  /** Which part is the strong one, counted from 1. */
  stress: z.coerce.number().int().min(1).max(12).optional(),
})

export type PronunciationQuery = z.infer<typeof pronunciationQuerySchema>

export const pronunciationFindingSchema = z.object({
  code: z.enum(PRONUNCIATION_CODES),
  /** How sure the scorer is, from 0 to 1. */
  confidence: z.number().min(0).max(1),
  /**
   * What was expected and what was heard, where the finding has both: a number of parts for a
   * syllable too many or too few, the number of the strong part for stress.
   */
  expected: z.number().int().min(0).max(24).optional(),
  heard: z.number().int().min(0).max(24).optional(),
  /**
   * For a sound that differed in something of several words: the words it was in, as they are
   * written in what was to be said and in that order. Never anything the scorer wrote itself.
   */
  words: z.array(z.string().min(1).max(40)).min(1).max(12).optional(),
})

export type PronunciationFinding = z.infer<typeof pronunciationFindingSchema>

/** What the check came to: `ok` alone, `nothingHeard` alone, or the corrections sure enough to show. */
export const pronunciationAssessmentSchema = z.object({
  findings: z.array(pronunciationFindingSchema).min(1).max(12),
})

export type PronunciationAssessment = z.infer<typeof pronunciationAssessmentSchema>
