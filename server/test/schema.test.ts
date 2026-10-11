import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { is } from 'drizzle-orm'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { describe, expect, it } from 'vitest'
import * as schema from '../src/db/schema/index.ts'

// These read the tables as they are written; none of them needs a database.

const migrations = fileURLToPath(new URL('../src/db/migrations', import.meta.url))
const tables = Object.values<unknown>(schema)
  .filter((value) => is(value, PgTable))
  .map((table) => getTableConfig(table))

describe('the tables', () => {
  it('are all in the migrations: nothing is left to generate', async () => {
    const snapshots = readdirSync(`${migrations}/meta`).filter((file) => /^\d+_/.test(file))
    const latest = snapshots.sort().at(-1) ?? ''
    const applied = JSON.parse(readFileSync(`${migrations}/meta/${latest}`, 'utf8'))

    const statements = await generateMigration(applied, generateDrizzleJson(schema))

    // If this fails: `npm run db:generate -w @kuhedu/server`.
    expect(statements).toEqual([])
  })

  it('remove everything of a learner with their account, and keep what an admin wrote', () => {
    const rules = tables.flatMap((table) =>
      table.foreignKeys.map((key) => {
        const { columns, foreignTable } = key.reference()
        return {
          from: `${table.name}.${columns.map((column) => column.name).join(',')}`,
          to: getTableConfig(foreignTable).name,
          onDelete: key.onDelete,
        }
      }),
    )
    const onDelete = (from: string) => rules.find((rule) => rule.from === from)?.onDelete

    // Every link says what happens: none is left to refuse the deletion of an account.
    expect(
      rules.filter((rule) => rule.onDelete !== 'cascade' && rule.onDelete !== 'set null'),
    ).toEqual([])

    for (const theirs of [
      'sessions.user_id',
      'oauth_identities.user_id',
      'learner_profiles.user_id',
      'lesson_marks.user_id',
      'placement_sessions.user_id',
      'placement_responses.session_id',
      'placement_results.user_id',
      'events.user_id',
    ]) {
      expect(onDelete(theirs), theirs).toBe('cascade')
    }
    for (const kept of [
      'audit_log.actor_user_id',
      'app_config.updated_by',
      'text_overrides.updated_by',
      'week_content.updated_by',
      'content_history.replaced_by',
      'assets.created_by',
    ]) {
      expect(onDelete(kept), kept).toBe('set null')
    }
  })

  it('check every list of allowed words in the database too', () => {
    const unchecked = tables.flatMap((table) =>
      table.columns
        .filter((column) => column.enumValues)
        .filter(
          (column) =>
            !table.checks.some((check) => check.name === `${table.name}_${column.name}_check`),
        )
        .map((column) => `${table.name}.${column.name}`),
    )

    // Day, part and scenario marks are checked together with the kind they belong to.
    expect(unchecked).toEqual(['lesson_marks.kind'])
    expect(
      tables.find((table) => table.name === 'lesson_marks')?.checks.map((check) => check.name),
    ).toContain('lesson_marks_ref_check')
  })
})
