import { z } from 'zod'
import { LEVELS, UNDERSTAND_TYPES } from '../types'

/**
 * Shape of the test's questions. They are content, so they are validated like anything that
 * will one day arrive from a server (TODO(backend), TODO(admin): an editor for the bank).
 */

const base = {
  id: z.string().min(1),
  level: z.enum(LEVELS),
  /**
   * What the learner has to understand, said in their own language (`{ bn: '…', hi: '…' }`).
   * Offered only as help; a question without one simply has no "translate".
   */
  translations: z.record(z.string(), z.string().min(1)).optional(),
}

const choice = {
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(3).max(4),
  /** Index of the right option. */
  answer: z.number().int().nonnegative(),
}

const listenItemSchema = z.object({
  ...base,
  ...choice,
  stage: z.literal('LISTEN'),
  /** Spoken aloud; shown only if the learner asks for the text. */
  audioText: z.string().min(1),
})

const understandItemSchema = z.object({
  ...base,
  ...choice,
  stage: z.literal('UNDERSTAND'),
  type: z.enum(UNDERSTAND_TYPES),
  /** A sentence or situation the question is about. */
  context: z.string().min(1).optional(),
})

const speakItemSchema = z.object({
  ...base,
  stage: z.literal('SPEAK'),
  prompt: z.string().min(1),
  /** An answer the learner can ask to hear. */
  modelAnswer: z.string().min(1),
})

export const itemSchema = z
  .discriminatedUnion('stage', [listenItemSchema, understandItemSchema, speakItemSchema])
  .refine((item) => item.stage === 'SPEAK' || item.answer < item.options.length, {
    message: 'answer must point at one of the options',
  })

export type ListenItem = z.infer<typeof listenItemSchema>
export type UnderstandItem = z.infer<typeof understandItemSchema>
export type SpeakItem = z.infer<typeof speakItemSchema>
export type ChoiceItem = ListenItem | UnderstandItem
export type PlacementItem = ChoiceItem | SpeakItem
