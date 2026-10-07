/** Difficulty levels the test can place a learner at, easiest first. */
export const LEVELS = ['FOUNDATION', 'A1', 'A2', 'B1', 'B2+'] as const
export type Level = (typeof LEVELS)[number]

/** The parts of the test, in the order they are taken. */
export const STAGES = ['LISTEN', 'UNDERSTAND', 'SPEAK'] as const
export type Stage = (typeof STAGES)[number]

export const UNDERSTAND_TYPES = ['vocabulary', 'meaning', 'grammar', 'functional'] as const
export type UnderstandType = (typeof UNDERSTAND_TYPES)[number]

/** A learner with no session has not started; there is no stored "NOT_STARTED". */
export const SESSION_STATUSES = ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

/**
 * Why a question got no answer.
 * - `notSure`: the learner said they did not know — evidence of "not yet".
 * - `audioFailed`: the device could not play it — no evidence about the learner at all.
 * - `declined`: the learner chose not to answer a speaking prompt.
 */
export const SKIP_REASONS = ['notSure', 'audioFailed', 'declined'] as const
export type SkipReason = (typeof SKIP_REASONS)[number]

/** Why a skill has no level. Never the same thing as a low level. */
export const NOT_ASSESSED_REASONS = [
  // TODO(backend): speech needs AI scoring on a server; until then it is recorded, not rated.
  'notScoredYet',
  'microphoneDenied',
  'microphoneUnavailable',
  'learnerSkipped',
  'audioUnavailable',
] as const
export type NotAssessedReason = (typeof NOT_ASSESSED_REASONS)[number]

export const DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]

export const SUPPORT_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const
export type SupportLevel = (typeof SUPPORT_LEVELS)[number]

export const SKILLS = ['listening', 'understanding', 'speaking'] as const
export type Skill = (typeof SKILLS)[number]

export const CONFIDENCES = ['low', 'medium', 'high'] as const
export type Confidence = (typeof CONFIDENCES)[number]
