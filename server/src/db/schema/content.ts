import { WEEK_CONTENT_KINDS } from '@kuhedu/contracts'
import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { users } from './accounts.ts'
import { createdAt, id, instant, isLanguageTag, isWeek, oneOf, updatedAt } from './columns.ts'

/**
 * What an admin manages. The app's settings objects are three kinds of thing, so they are kept
 * in three shapes. In all three only what an admin wrote is stored: the built-in content stays
 * in the app, which is what it shows where there is no row.
 */

/** Small objects read at start-up and saved whole. */
export const APP_CONFIG_NAMES = ['landing', 'languages', 'learner-profiles'] as const

/** The app's `screen-texts` and `curriculum` settings. */
export const TEXT_SCOPES = ['screen', 'curriculum'] as const

export const CONTENT_SOURCES = ['app_config', 'text_override', 'week_content'] as const

/** What an uploaded picture may be: raster only, as the app's `assetUrl` rule has it. */
export const ASSET_MIME_TYPES = ['image/webp', 'image/png', 'image/jpeg'] as const

const updatedBy = () => uuid('updated_by').references(() => users.id, { onDelete: 'set null' })

/** Counts the saves. A save says which one it was based on; an older one is refused, not kept. */
const version = () => integer('version').notNull().default(1)

export const appConfig = pgTable(
  'app_config',
  {
    name: text('name', { enum: APP_CONFIG_NAMES }).primaryKey(),
    value: jsonb('value').notNull(),
    version: version(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (table) => [
    check('app_config_name_check', oneOf(table.name, APP_CONFIG_NAMES)),
    check('app_config_version_check', sql`${table.version} >= 1`),
  ],
)

/**
 * One row per text an admin reworded, so two admins writing different texts cannot overwrite
 * each other. `key` is a screen-text key (`home.title`) or a course key (`week.16.goal`); which
 * keys exist is the app's to say, so a key the app no longer has is simply never asked for.
 */
export const textOverrides = pgTable(
  'text_overrides',
  {
    scope: text('scope', { enum: TEXT_SCOPES }).notNull(),
    language: text('language').notNull(),
    key: text('key').notNull(),
    text: text('text').notNull(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.language, table.key] }),
    check('text_overrides_scope_check', oneOf(table.scope, TEXT_SCOPES)),
    check('text_overrides_language_check', isLanguageTag(table.language)),
    // An empty text is not an override: the row is removed and the built-in wording returns.
    check('text_overrides_text_check', sql`btrim(${table.text}) <> ''`),
  ],
)

/**
 * One row per kind of content and week, so a phone downloads the week it opens, not all 50.
 * `value` is that week's entry of the app's settings object (a `WeekDialogue`, a `WeekQuiz`, …),
 * as `parseWeekContent` in `@kuhedu/contracts` reads it; the kinds are its `WEEK_CONTENT_KINDS`,
 * one per `week-…` settings object of the app.
 */
export const weekContent = pgTable(
  'week_content',
  {
    kind: text('kind', { enum: WEEK_CONTENT_KINDS }).notNull(),
    week: integer('week').notNull(),
    value: jsonb('value').notNull(),
    version: version(),
    updatedAt: updatedAt(),
    updatedBy: updatedBy(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.week] }),
    index('week_content_week_idx').on(table.week),
    check('week_content_kind_check', oneOf(table.kind, WEEK_CONTENT_KINDS)),
    check('week_content_week_check', isWeek(table.week)),
    check('week_content_version_check', sql`${table.version} >= 1`),
  ],
)

/**
 * What a row of the three tables above held before a save or a removal replaced it: for undo,
 * and to see what changed. The first save of something has nothing before it and adds no row.
 */
export const contentHistory = pgTable(
  'content_history',
  {
    id: id(),
    source: text('source', { enum: CONTENT_SOURCES }).notNull(),
    /** The row's key as one text: `landing`, `screen/bn/home.title`, `dialogue/12`. */
    ref: text('ref').notNull(),
    /** What it held; for a text override, the text. */
    value: jsonb('value').notNull(),
    /** The version that was replaced, where the row has one. */
    version: integer('version'),
    replacedAt: instant('replaced_at').notNull().defaultNow(),
    replacedBy: uuid('replaced_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('content_history_ref_idx').on(table.source, table.ref, table.replacedAt),
    check('content_history_source_check', oneOf(table.source, CONTENT_SOURCES)),
  ],
)

/**
 * An uploaded picture. The file is in object storage under `storageKey` and is served from
 * `/media/<sha256>.webp`; the same picture uploaded twice is one file and one row.
 */
export const assets = pgTable(
  'assets',
  {
    id: id(),
    sha256: text('sha256').notNull().unique(),
    mime: text('mime', { enum: ASSET_MIME_TYPES }).notNull(),
    bytes: integer('bytes').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    storageKey: text('storage_key').notNull().unique(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (table) => [
    check('assets_sha256_check', sql`${table.sha256} ~ '^[0-9a-f]{64}$'`),
    check('assets_mime_check', oneOf(table.mime, ASSET_MIME_TYPES)),
    check(
      'assets_size_check',
      sql`${table.bytes} > 0 and ${table.width} > 0 and ${table.height} > 0`,
    ),
  ],
)
