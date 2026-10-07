import { z } from 'zod'
import {
  CONFIDENCES,
  DEVICE_TYPES,
  LEVELS,
  NOT_ASSESSED_REASONS,
  SESSION_STATUSES,
  SKILLS,
  SKIP_REASONS,
  STAGES,
  SUPPORT_LEVELS,
  UNDERSTAND_TYPES,
} from '../types'

/**
 * Everything the placement test keeps in browser storage. Storage is untrusted input (an older
 * build, another tab, a curious user), so it is parsed with these schemas before use.
 */

/** What the learner did on one question. Facts only: never audio, never what was said. */
export const responseSchema = z.object({
  itemId: z.string(),
  stage: z.enum(STAGES),
  level: z.enum(LEVELS),
  answeredAt: z.string(),
  timeTakenMs: z.number().nonnegative(),
  /** Index of the chosen option; `null` for speaking prompts and skipped questions. */
  answer: z.number().int().nonnegative().nullable(),
  /** `null` where right and wrong do not apply (speaking, skipped for a technical reason). */
  correct: z.boolean().nullable(),
  skipped: z.enum(SKIP_REASONS).nullable(),
  /** Times the audio (or the speaking prompt) was played at normal speed. */
  playCount: z.number().int().nonnegative(),
  slowPlayCount: z.number().int().nonnegative(),
  helpOpened: z.boolean(),
  transcriptShown: z.boolean(),
  translationOffered: z.boolean(),
  translationUsed: z.boolean(),
  /** The learner asked to hear an example answer before speaking. */
  modelPlayed: z.boolean(),
  recordingAttempts: z.number().int().nonnegative(),
  recordingDurationMs: z.number().nonnegative(),
})

export type PlacementResponse = z.infer<typeof responseSchema>

const notAssessedReason = z.enum(NOT_ASSESSED_REASONS)

export const sessionSchema = z.object({
  /** e.g. `PL-20261007-8F42A`. */
  id: z.string().min(1),
  /** The question bank this session was started on. */
  version: z.string(),
  status: z.enum(SESSION_STATUSES),
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  /** The learner's language when they started, in which help is offered. */
  languageSupport: z.string(),
  deviceType: z.enum(DEVICE_TYPES),
  stage: z.enum(STAGES),
  /** `false` while the current stage's introduction is showing. */
  stageStarted: z.boolean(),
  currentItemId: z.string().nullable(),
  responses: z.array(responseSchema),
  /** Stages that ended without evidence, and why. */
  notAssessed: z.object({
    LISTEN: notAssessedReason.optional(),
    UNDERSTAND: notAssessedReason.optional(),
    SPEAK: notAssessedReason.optional(),
  }),
})

export type PlacementSession = z.infer<typeof sessionSchema>

const skillResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('assessed'),
    level: z.enum(LEVELS),
    confidence: z.enum(CONFIDENCES),
  }),
  z.object({ status: z.literal('notAssessed'), reason: notAssessedReason }),
])

export type SkillResult = z.infer<typeof skillResultSchema>

const tallySchema = z.object({
  correct: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
})

/** A ratio from 0 to 1, or `null` when there was nothing to measure it on. */
const ratio = z.number().min(0).max(1).nullable()

export const resultSchema = z.object({
  sessionId: z.string(),
  version: z.string(),
  completedAt: z.string(),
  profile: z.object({
    listening: skillResultSchema,
    understanding: skillResultSchema,
    speaking: skillResultSchema,
    /** Right answers per kind of Understand question — too few to call a level. */
    understandBreakdown: z.object(
      Object.fromEntries(UNDERSTAND_TYPES.map((type) => [type, tallySchema])) as Record<
        (typeof UNDERSTAND_TYPES)[number],
        typeof tallySchema
      >,
    ),
    dependency: z.object({
      /** Translations used out of those offered. */
      translation: ratio,
      /** Listening questions heard more than once (or slowly). */
      replay: ratio,
      /** Questions on which help was opened. */
      help: ratio,
    }),
    /** Speaking prompts the learner recorded an answer to. */
    speakingAttempts: z.number().int().nonnegative(),
  }),
  recommendation: z.object({
    startLevel: z.enum(LEVELS),
    supportLevel: z.enum(SUPPORT_LEVELS),
    prioritySkills: z.array(z.enum(SKILLS)),
    /** `true` while a skill is still unscored, so the level may move once it is. */
    provisional: z.boolean(),
    // TODO(lessons): recommended section and week, once the curriculum is in the app.
  }),
})

export type PlacementResult = z.infer<typeof resultSchema>

export const eventSchema = z.object({
  event: z.string(),
  sessionId: z.string(),
  itemId: z.string().nullable(),
  stage: z.enum(STAGES).nullable(),
  timestamp: z.string(),
})

export type PlacementEvent = z.infer<typeof eventSchema>
