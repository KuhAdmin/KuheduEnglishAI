import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { readEnv } from '../env.ts'
import { connectDatabase } from './client.ts'

/**
 * Bring the database up to date: applies, in order, every migration it has not seen yet.
 * Run with `npm run db:migrate -w @kuhedu/server`. Safe to run again; a migration already
 * applied is skipped.
 */
const env = readEnv()
const database = connectDatabase(env)

try {
  await migrate(database.db, {
    migrationsFolder: fileURLToPath(new URL('./migrations', import.meta.url)),
  })
  console.log(`Database "${env.PGDATABASE}" on ${env.PGHOST} is up to date.`)
} finally {
  await database.close()
}
