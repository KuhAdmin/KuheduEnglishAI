import { sql, type SQL } from 'drizzle-orm'
import { customType, timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'

/**
 * What the tables are built from. The rules here are also in the Zod schemas the routes use;
 * the database repeats them so that nothing else that writes to it (a script, a person at a
 * prompt) can leave a row the app cannot read.
 */

/** The course's fixed size, as in the app's `curriculum.ts`: 10 sections of 5 weeks, 7 days each. */
export const WEEK_COUNT = 50
export const DAYS_PER_WEEK = 7

/** Text that compares without regard to case (the extension comes with the first migration). */
export const citext = customType<{ data: string }>({ dataType: () => 'citext' })

export const id = () => uuid('id').primaryKey().defaultRandom()

/** A moment in time. Always with its zone: a server and a phone rarely share one. */
export const instant = (name: string) => timestamp(name, { withTimezone: true })

export const createdAt = () => instant('created_at').notNull().defaultNow()

export const updatedAt = () =>
  instant('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

const quoted = (value: string) => `'${value.replaceAll("'", "''")}'`

/**
 * For a `CHECK`: the column holds one of these words. The lists are kept as text with a check
 * rather than as PostgreSQL enums, which cannot lose a value once they have it.
 */
export const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${sql.raw(values.map(quoted).join(', '))})`

/** For a `CHECK`: a week of the course. */
export const isWeek = (column: AnyPgColumn): SQL =>
  sql`${column} between 1 and ${sql.raw(String(WEEK_COUNT))}`

/** For a `CHECK`: a language tag such as `bn`, `hi` or `en-IN`, as `languageTag` in the app. */
export const isLanguageTag = (column: AnyPgColumn): SQL =>
  sql`${column} ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$'`
