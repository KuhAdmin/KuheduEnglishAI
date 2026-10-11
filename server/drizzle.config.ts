import { defineConfig } from 'drizzle-kit'
import { readEnv } from './src/env.ts'

// Only for writing migrations from the tables (`npm run db:generate`); applying them is
// `src/db/migrate.ts`, which needs no tooling in production.
const env = readEnv()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dbCredentials: {
    host: env.PGHOST,
    port: env.PGPORT,
    database: env.PGDATABASE,
    user: env.PGUSER,
    password: env.PGPASSWORD,
    ssl: false,
  },
})
