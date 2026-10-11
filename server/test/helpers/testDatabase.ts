import { fileURLToPath } from 'node:url'
import { is, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import pg from 'pg'
import { connectDatabase } from '../../src/db/client.ts'
import * as schema from '../../src/db/schema/index.ts'
import { readEnv } from '../../src/env.ts'

/**
 * A database for the tests that need one (`*.db.test.ts`): `<PGDATABASE>_test`, beside the
 * development database on the same PostgreSQL, made and brought up to date here. Never the
 * development database itself: `reset` empties every table.
 */
export async function openTestDatabase() {
  const base = readEnv()
  const name = base.PGDATABASE.endsWith('_test') ? base.PGDATABASE : `${base.PGDATABASE}_test`
  const env = { ...base, PGDATABASE: name }

  const admin = new pg.Client({
    host: base.PGHOST,
    port: base.PGPORT,
    database: base.PGDATABASE,
    user: base.PGUSER,
    password: base.PGPASSWORD,
  })
  await admin.connect()
  try {
    const existing = await admin.query('select 1 from pg_database where datname = $1', [name])
    // The name comes from this machine's own settings and is quoted as an identifier.
    if (existing.rowCount === 0)
      await admin.query(`create database "${name.replaceAll('"', '""')}"`)
  } finally {
    await admin.end()
  }

  const database = connectDatabase(env)
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('../../src/db/migrations', import.meta.url)),
  })

  const tables = Object.values<unknown>(schema)
    .filter((value) => is(value, PgTable))
    .map((table) => `"${getTableConfig(table).name}"`)

  return {
    ...database,
    /** Empty every table, so each test starts from nothing. */
    async reset() {
      if (!name.endsWith('_test')) throw new Error(`Refusing to empty "${name}"`)
      await database.db.execute(
        sql.raw(`truncate table ${tables.join(', ')} restart identity cascade`),
      )
    },
  }
}

export type TestDatabase = Awaited<ReturnType<typeof openTestDatabase>>
