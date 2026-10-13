import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './accounts.ts'
import { id, instant, isLanguageTag, oneOf } from './columns.ts'

/**
 * The placement test, in the shapes the app already keeps (`sessionSchema`, `responseSchema`
 * and `resultSchema` in the app's `features/placement`), so a test taken in the browser can be
 * stored as it is. The lists below are that feature's `types.ts`.
 */
export const PLACEMENT_LEVELS = ['FOUNDATION', 'A1', 'A2', 'B1', 'B2+'] as const
export const PLACEMENT_STAGES = ['LISTEN', 'UNDERSTAND', 'SPEAK'] as const
export const PLACEMENT_STATUSES = ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED'] as const
export const PLACEMENT_SKIP_REASONS = ['notSure', 'audioFailed', 'declined'] as const
export const PLACEMENT_DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const
export const PLACEMENT_SUPPORT_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const
export const PLACEMENT_SKILLS = ['listening', 'understanding', 'speaking'] as const

/** Why a stage ended without evidence, by stage: `{ SPEAK: 'notScoredYet' }`. */
type NotAssessed = Partial<Record<(typeof PLACEMENT_STAGES)[number], string>>

export const placementSessions = pgTable(
  'placement_sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The id the app gave it, e.g. `PL-20261007-8F42A`: saving the same test twice is one row. */
    clientId: text('client_id').notNull(),
    /** The question bank it was started on. */
    version: text('version').notNull(),
    status: text('status', { enum: PLACEMENT_STATUSES }).notNull(),
    stage: text('stage', { enum: PLACEMENT_STAGES }).notNull(),
    /** `false` while the stage's introduction is showing. */
    stageStarted: boolean('stage_started').notNull(),
    currentItemId: text('current_item_id'),
    /** The learner's language when they started, in which help is offered. */
    languageSupport: text('language_support').notNull(),
    deviceType: text('device_type', { enum: PLACEMENT_DEVICE_TYPES }).notNull(),
    notAssessed: jsonb('not_assessed').$type<NotAssessed>().notNull().default({}),
    // The three times are the phone's, as the app recorded them.
    startedAt: instant('started_at').notNull(),
    updatedAt: instant('updated_at').notNull(),
    completedAt: instant('completed_at'),
  },
  (table) => [
    unique('placement_sessions_user_id_client_id_unique').on(table.userId, table.clientId),
    check('placement_sessions_status_check', oneOf(table.status, PLACEMENT_STATUSES)),
    check('placement_sessions_stage_check', oneOf(table.stage, PLACEMENT_STAGES)),
    check('placement_sessions_device_type_check', oneOf(table.deviceType, PLACEMENT_DEVICE_TYPES)),
    check('placement_sessions_language_support_check', isLanguageTag(table.languageSupport)),
    check(
      'placement_sessions_completed_check',
      sql`${table.status} <> 'COMPLETED' or ${table.completedAt} is not null`,
    ),
  ],
)

/** What the learner did on one question. Facts only: never audio, never what was said. */
export const placementResponses = pgTable(
  'placement_responses',
  {
    sessionId: uuid('session_id')
      .notNull()
      .references(() => placementSessions.id, { onDelete: 'cascade' }),
    /** Its place in the session, from 0. */
    seq: integer('seq').notNull(),
    itemId: text('item_id').notNull(),
    stage: text('stage', { enum: PLACEMENT_STAGES }).notNull(),
    level: text('level', { enum: PLACEMENT_LEVELS }).notNull(),
    answeredAt: instant('answered_at').notNull(),
    // Measured by the browser's own clock, which counts in fractions of a millisecond.
    timeTakenMs: doublePrecision('time_taken_ms').notNull(),
    /** The place of the chosen option; empty for speaking prompts and skipped questions. */
    answer: integer('answer'),
    /** Empty where right and wrong do not apply: it is never read as wrong. */
    correct: boolean('correct'),
    skipped: text('skipped', { enum: PLACEMENT_SKIP_REASONS }),
    playCount: integer('play_count').notNull(),
    slowPlayCount: integer('slow_play_count').notNull(),
    helpOpened: boolean('help_opened').notNull(),
    transcriptShown: boolean('transcript_shown').notNull(),
    translationOffered: boolean('translation_offered').notNull(),
    translationUsed: boolean('translation_used').notNull(),
    modelPlayed: boolean('model_played').notNull(),
    recordingAttempts: integer('recording_attempts').notNull(),
    recordingDurationMs: doublePrecision('recording_duration_ms').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sessionId, table.seq] }),
    check('placement_responses_stage_check', oneOf(table.stage, PLACEMENT_STAGES)),
    check('placement_responses_level_check', oneOf(table.level, PLACEMENT_LEVELS)),
    check('placement_responses_skipped_check', oneOf(table.skipped, PLACEMENT_SKIP_REASONS)),
    check(
      'placement_responses_counts_check',
      sql`${table.seq} >= 0 and ${table.answer} >= 0 and ${table.timeTakenMs} >= 0 and ${table.playCount} >= 0 and ${table.slowPlayCount} >= 0 and ${table.recordingAttempts} >= 0 and ${table.recordingDurationMs} >= 0`,
    ),
  ],
)

/**
 * Where a finished test places the learner. Worked out by the app for now, so it is stored as
 * the app computed it; what other things are read by (the levels) has columns of its own.
 */
export const placementResults = pgTable(
  'placement_results',
  {
    sessionId: uuid('session_id')
      .primaryKey()
      .references(() => placementSessions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    completedAt: instant('completed_at').notNull(),
    /** `resultSchema.profile`: each skill's level or why it has none, and how much help was used. */
    profile: jsonb('profile').notNull(),
    startLevel: text('start_level', { enum: PLACEMENT_LEVELS }).notNull(),
    supportLevel: text('support_level', { enum: PLACEMENT_SUPPORT_LEVELS }).notNull(),
    prioritySkills: text('priority_skills', { enum: PLACEMENT_SKILLS }).array().notNull(),
    /** `true` while a skill is still unscored, so the level may move once it is. */
    provisional: boolean('provisional').notNull(),
  },
  (table) => [
    index('placement_results_user_id_idx').on(table.userId, table.completedAt),
    check('placement_results_start_level_check', oneOf(table.startLevel, PLACEMENT_LEVELS)),
    check(
      'placement_results_support_level_check',
      oneOf(table.supportLevel, PLACEMENT_SUPPORT_LEVELS),
    ),
    check(
      'placement_results_priority_skills_check',
      sql`${table.prioritySkills} <@ array[${sql.raw(PLACEMENT_SKILLS.map((skill) => `'${skill}'`).join(', '))}]`,
    ),
  ],
)
