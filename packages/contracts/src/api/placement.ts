import { z } from 'zod'

/**
 * The placement test as it is kept: by the app in the browser, and by the server with the
 * learner's account. One shape for both, so a test taken in the browser is stored as it is.
 * The engine and the scoring stay in the app; the server keeps what the app worked out.
 */

/** Difficulty levels the test can place a learner at, easiest first. */
export const PLACEMENT_LEVELS = ['FOUNDATION', 'A1', 'A2', 'B1', 'B2+'] as const
export type PlacementLevel = (typeof PLACEMENT_LEVELS)[number]

/** The parts of the test, in the order they are taken. */
export const PLACEMENT_STAGES = ['LISTEN', 'UNDERSTAND', 'SPEAK'] as const
export type PlacementStage = (typeof PLACEMENT_STAGES)[number]

export const PLACEMENT_UNDERSTAND_TYPES = [
  'vocabulary',
  'meaning',
  'grammar',
  'functional',
] as const
export type PlacementUnderstandType = (typeof PLACEMENT_UNDERSTAND_TYPES)[number]

/** A learner with no session has not started; there is no stored "NOT_STARTED". */
export const PLACEMENT_STATUSES = ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'] as const
export type PlacementStatus = (typeof PLACEMENT_STATUSES)[number]

/**
 * Why a question got no answer.
 * - `notSure`: the learner said they did not know — evidence of "not yet".
 * - `audioFailed`: the device could not play it — no evidence about the learner at all.
 * - `declined`: the learner chose not to answer a speaking prompt.
 */
export const PLACEMENT_SKIP_REASONS = ['notSure', 'audioFailed', 'declined'] as const
export type PlacementSkipReason = (typeof PLACEMENT_SKIP_REASONS)[number]

/** Why a skill has no level. Never the same thing as a low level. */
export const PLACEMENT_NOT_ASSESSED_REASONS = [
  // TODO(backend): speech needs AI scoring on a server; until then it is recorded, not rated.
  'notScoredYet',
  'microphoneDenied',
  'microphoneUnavailable',
  'learnerSkipped',
  'audioUnavailable',
] as const
export type PlacementNotAssessedReason = (typeof PLACEMENT_NOT_ASSESSED_REASONS)[number]

export const PLACEMENT_DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const
export type PlacementDeviceType = (typeof PLACEMENT_DEVICE_TYPES)[number]

export const PLACEMENT_SUPPORT_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const
export type PlacementSupportLevel = (typeof PLACEMENT_SUPPORT_LEVELS)[number]

export const PLACEMENT_SKILLS = ['listening', 'understanding', 'speaking'] as const
export type PlacementSkill = (typeof PLACEMENT_SKILLS)[number]

export const PLACEMENT_CONFIDENCES = ['low', 'medium', 'high'] as const
export type PlacementConfidence = (typeof PLACEMENT_CONFIDENCES)[number]

/** What the learner did on one question. Facts only: never audio, never what was said. */
export const placementResponseSchema = z.object({
  itemId: z.string(),
  stage: z.enum(PLACEMENT_STAGES),
  level: z.enum(PLACEMENT_LEVELS),
  answeredAt: z.string(),
  timeTakenMs: z.number().nonnegative(),
  /** Index of the chosen option; `null` for speaking prompts and skipped questions. */
  answer: z.number().int().nonnegative().nullable(),
  /** `null` where right and wrong do not apply (speaking, skipped for a technical reason). */
  correct: z.boolean().nullable(),
  skipped: z.enum(PLACEMENT_SKIP_REASONS).nullable(),
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

export type PlacementResponse = z.infer<typeof placementResponseSchema>

const notAssessedReason = z.enum(PLACEMENT_NOT_ASSESSED_REASONS)

export const placementSessionSchema = z.object({
  /** e.g. `PL-20261007-8F42A`. */
  id: z.string().min(1),
  /** The question bank this session was started on. */
  version: z.string(),
  status: z.enum(PLACEMENT_STATUSES),
  startedAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  /** The learner's language when they started, in which help is offered. */
  languageSupport: z.string(),
  deviceType: z.enum(PLACEMENT_DEVICE_TYPES),
  stage: z.enum(PLACEMENT_STAGES),
  /** `false` while the current stage's introduction is showing. */
  stageStarted: z.boolean(),
  currentItemId: z.string().nullable(),
  responses: z.array(placementResponseSchema),
  /** Stages that ended without evidence, and why. */
  notAssessed: z.object({
    LISTEN: notAssessedReason.optional(),
    UNDERSTAND: notAssessedReason.optional(),
    SPEAK: notAssessedReason.optional(),
  }),
})

export type PlacementSession = z.infer<typeof placementSessionSchema>

const skillResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('assessed'),
    level: z.enum(PLACEMENT_LEVELS),
    confidence: z.enum(PLACEMENT_CONFIDENCES),
  }),
  z.object({ status: z.literal('notAssessed'), reason: notAssessedReason }),
])

export type PlacementSkillResult = z.infer<typeof skillResultSchema>

const tallySchema = z.object({
  correct: z.number().int().nonnegative(),
  attempted: z.number().int().nonnegative(),
})

/** A ratio from 0 to 1, or `null` when there was nothing to measure it on. */
const ratio = z.number().min(0).max(1).nullable()

export const placementResultSchema = z.object({
  sessionId: z.string(),
  version: z.string(),
  completedAt: z.string(),
  profile: z.object({
    listening: skillResultSchema,
    understanding: skillResultSchema,
    speaking: skillResultSchema,
    /** Right answers per kind of Understand question — too few to call a level. */
    understandBreakdown: z.object(
      Object.fromEntries(PLACEMENT_UNDERSTAND_TYPES.map((type) => [type, tallySchema])) as Record<
        PlacementUnderstandType,
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
    startLevel: z.enum(PLACEMENT_LEVELS),
    supportLevel: z.enum(PLACEMENT_SUPPORT_LEVELS),
    prioritySkills: z.array(z.enum(PLACEMENT_SKILLS)),
    /** `true` while a skill is still unscored, so the level may move once it is. */
    provisional: z.boolean(),
    // TODO(lessons): recommended section and week, once the curriculum is in the app.
  }),
})

export type PlacementResult = z.infer<typeof placementResultSchema>
