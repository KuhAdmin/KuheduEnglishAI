import {
  DAYS_PER_WEEK,
  LEARNER_AGE_GROUPS,
  LEARNER_TUTOR_AVATARS,
  LESSON_MARK_KINDS,
  LESSON_REVIEW_PARTS,
  LESSON_SCENARIOS_MAX,
  type LearnerVoices,
} from '@kuhedu/contracts'
import { sql } from 'drizzle-orm'
import { check, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './accounts.ts'
import { createdAt, instant, isLanguageTag, isWeek, oneOf, updatedAt } from './columns.ts'

// The lists of allowed words are `@kuhedu/contracts`' (`api/me.ts`): the routes check a request
// against them, and the checks below hold the tables to the same.

const DAY_REFS = Array.from({ length: DAYS_PER_WEEK }, (_, index) => String(index + 1))
/** A scenario is marked by its place in the week's list, from 0, as the app's store keeps it. */
const SCENARIO_REFS = Array.from({ length: LESSON_SCENARIOS_MAX }, (_, index) => String(index))

/**
 * What the learner told the app about themselves, and how they set it up. Each answer is empty
 * until it is given, and the app then shows its default (English, the first tutor, the look that
 * follows the device, each tutor's default voice).
 * The tutor's mute is the device's and is not kept here; their photo has a table of its own.
 */
export const learnerProfiles = pgTable(
  'learner_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    language: text('language'),
    ageGroup: text('age_group', { enum: LEARNER_AGE_GROUPS }),
    tutorAvatar: text('tutor_avatar', { enum: LEARNER_TUTOR_AVATARS }),
    /**
     * The look of the app they chose: `auto` or a theme's id. Only its form is checked: which
     * themes there are is the app's to say, and a new one must not need a migration.
     */
    theme: text('theme'),
    /** The voice chosen for each kind of tutor, by base language: `{ en: { female: 'af_heart' } }`. */
    voices: jsonb('voices').$type<LearnerVoices>().notNull().default({}),
    /** TODO(placement): empty until there is a rule from a placement level to a week. */
    startWeek: integer('start_week'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check('learner_profiles_language_check', isLanguageTag(table.language)),
    check('learner_profiles_age_group_check', oneOf(table.ageGroup, LEARNER_AGE_GROUPS)),
    check('learner_profiles_tutor_avatar_check', oneOf(table.tutorAvatar, LEARNER_TUTOR_AVATARS)),
    check('learner_profiles_theme_check', sql`${table.theme} ~ '^[a-z][a-z0-9-]{0,39}$'`),
    check('learner_profiles_start_week_check', isWeek(table.startWeek)),
  ],
)

/**
 * The photo a learner chose for their profile, as the app made it: a small picture, shrunk and
 * re-encoded in the browser, kept as the `data:` URL it is shown from. In a table of its own so
 * that nothing else that reads a profile carries it. Shown to its owner only.
 */
export const learnerPhotos = pgTable(
  'learner_photos',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    photo: text('photo').notNull(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Written without the `;` that follows the type in a `data:` URL: the tool that writes
    // migrations cuts a statement at the first one it meets (it truncated this check there).
    check('learner_photos_photo_check', sql`starts_with(${table.photo}, 'data:image/')`),
  ],
)

/**
 * Lesson progress, one row per thing done. Rows are only ever added: adding one twice changes
 * nothing, so a phone can send again what it queued while offline, and what it did before the
 * server kept progress can be added to the account without anything to reconcile.
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
          sql`(${table.kind} = 'review_part' and ${oneOf(table.ref, LESSON_REVIEW_PARTS)})`,
          sql`(${table.kind} = 'scenario' and ${oneOf(table.ref, SCENARIO_REFS)})`,
        ],
        sql` or `,
      ),
    ),
  ],
)
