import { sql } from 'drizzle-orm'
import { check, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './accounts.ts'
import {
  createdAt,
  DAYS_PER_WEEK,
  instant,
  isLanguageTag,
  isWeek,
  oneOf,
  updatedAt,
} from './columns.ts'

/** As in the app's `ageGroups.ts` and `tutorAvatar.ts`: fixed in code, not admin settings. */
export const AGE_GROUPS = ['child', 'teen', 'adult'] as const
export const TUTOR_AVATARS = ['male', 'female'] as const

/**
 * What a learner can have done in a week: heard its opening conversation through, finished a
 * day, done a part of the review (Day 6), taken a scenario of the challenge (Day 7) to its end.
 */
export const LESSON_MARK_KINDS = ['heard', 'day', 'review_part', 'scenario'] as const
/** As `REVIEW_PARTS` in the app's `weekReviews.ts`. */
export const REVIEW_PARTS = ['quiz', 'listening', 'speaking', 'flashcards', 'roleplay'] as const
/** As `MAX_SCENARIOS` in the app's `weekScenarios.ts`. */
export const MAX_SCENARIOS = 3

const DAY_REFS = Array.from({ length: DAYS_PER_WEEK }, (_, index) => String(index + 1))
/** A scenario is marked by its place in the week's list, from 0, as the app's store keeps it. */
const SCENARIO_REFS = Array.from({ length: MAX_SCENARIOS }, (_, index) => String(index))

/**
 * What the learner told the app about themselves. Each answer is empty until it is given, and
 * the app then shows its default (English, the first tutor), exactly as it does for a guest.
 * Voices, the theme and the tutor's mute are the device's and are not kept here.
 */
export const learnerProfiles = pgTable(
  'learner_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    language: text('language'),
    ageGroup: text('age_group', { enum: AGE_GROUPS }),
    tutorAvatar: text('tutor_avatar', { enum: TUTOR_AVATARS }),
    /** TODO(placement): empty until there is a rule from a placement level to a week. */
    startWeek: integer('start_week'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('learner_profiles_language_check', isLanguageTag(table.language)),
    check('learner_profiles_age_group_check', oneOf(table.ageGroup, AGE_GROUPS)),
    check('learner_profiles_tutor_avatar_check', oneOf(table.tutorAvatar, TUTOR_AVATARS)),
    check('learner_profiles_start_week_check', isWeek(table.startWeek)),
  ],
)

/**
 * Lesson progress, one row per thing done. Rows are only ever added: adding one twice changes
 * nothing, so a phone can send again what it queued while offline, and a guest's progress can
 * be merged into an account without anything to reconcile.
 */
export const lessonMarks = pgTable(
  'lesson_marks',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    week: integer('week').notNull(),
    kind: text('kind', { enum: LESSON_MARK_KINDS }).notNull(),
    /** Which one: the day (`1` to `7`), the part's name, the scenario's place; empty for `heard`. */
    ref: text('ref').notNull().default(''),
    completedAt: instant('completed_at').notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.week, table.kind, table.ref] }),
    check('lesson_marks_week_check', isWeek(table.week)),
    check(
      'lesson_marks_ref_check',
      sql.join(
        [
          sql`(${table.kind} = 'heard' and ${table.ref} = '')`,
          sql`(${table.kind} = 'day' and ${oneOf(table.ref, DAY_REFS)})`,
          sql`(${table.kind} = 'review_part' and ${oneOf(table.ref, REVIEW_PARTS)})`,
          sql`(${table.kind} = 'scenario' and ${oneOf(table.ref, SCENARIO_REFS)})`,
        ],
        sql` or `,
      ),
    ),
  ],
)
