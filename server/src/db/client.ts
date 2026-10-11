import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import type { Env } from '../env.ts'
import * as schema from './schema/index.ts'

/** How long the health check waits for the database before calling it down. */
const CHECK_TIMEOUT_MS = 2000

/** The connection pool, the typed query builder on it, and how to tell whether it is alive. */
export function connectDatabase(env: Env) {
  const pool = new pg.Pool({
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    max: 10,
    connectionTimeoutMillis: 5000,
  })
  // A connection that drops while idle must not take the process down with it.
  pool.on('error', () => {})

  return {
    pool,
    db: drizzle(pool, { schema }),
    /** One trivial query, bounded in time; never throws. */
    async check(): Promise<boolean> {
      let timer: ReturnType<typeof setTimeout> | undefined
      try {
        await Promise.race([
          pool.query('select 1'),
          new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS)
          }),
        ])
        return true
      } catch {
        return false
      } finally {
        clearTimeout(timer)
      }
    },
    close: () => pool.end(),
  }
}

export type Database = ReturnType<typeof connectDatabase>

/** The typed query builder. */
export type Db = Database['db']
/** The query builder, or a transaction under way on it: what a function that only queries takes. */
export type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0]
