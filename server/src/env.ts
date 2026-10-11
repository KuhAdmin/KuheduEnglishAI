import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

/**
 * What the server is told from outside. Secrets live here and nowhere else: never in a `VITE_*`
 * variable (those ship to the browser), never in the repo. In development they come from
 * `server/.env`, which git ignores; anything already set in the environment wins over that file.
 */

const envFile = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** Where the server listens. Only this machine unless told otherwise. */
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),

  // The database, by the names PostgreSQL's own tools use. Kept apart rather than as one URL,
  // so a password may hold any character without being encoded.
  PGHOST: z.string().min(1).default('localhost'),
  PGPORT: z.coerce.number().int().min(1).max(65535).default(5432),
  PGDATABASE: z.string().min(1),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),

  /**
   * Keys the hashes of the codes sent by email, so the table alone cannot be used to try them
   * out. Changing it makes the codes already sent stop working, nothing else.
   */
  SESSION_SECRET: z.string().min(32).optional(),
  /**
   * `true` behind the HTTPS server that passes requests on, so that the caller's address and
   * `https` are read from what it forwards. Never when the server is reached directly.
   */
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),

  // Sending the codes. Without these, development writes the code to the server's log instead.
  SMTP_URL: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).optional(),

  /** Google sign-in is offered only when this is set (the app has the same id, which is public). */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),

  /** Where the speaking service (`speech/tts`, `npm run dev:speech`) listens, on this machine. */
  SPEECH_URL: z.url().default('http://127.0.0.1:8788'),
  /** Where sounds already made are kept. Left out, a folder beside the server's code. */
  SPEECH_CACHE_DIR: z.string().min(1).optional(),
})

/** What a server that real people use cannot do without; development has stand-ins for them. */
const REQUIRED_IN_PRODUCTION = ['SESSION_SECRET', 'SMTP_URL', 'MAIL_FROM'] as const

/** Only for a developer's own machine: it is in the repo, so it keeps nothing secret. */
const DEVELOPMENT_SECRET = 'kuhedu-development-only-not-a-secret'

type RawEnv = z.infer<typeof envSchema>
export type Env = Omit<RawEnv, 'SESSION_SECRET'> & { SESSION_SECRET: string }

/** Read and check the environment. Says which settings are wrong, never what they hold. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
    throw new Error(
      `Server settings missing or invalid: ${names.join(', ')}. See server/.env.example.`,
    )
  }

  const env = result.data
  if (env.NODE_ENV === 'production') {
    const missing = REQUIRED_IN_PRODUCTION.filter((name) => env[name] === undefined)
    if (missing.length > 0) {
      throw new Error(
        `Server settings needed in production: ${missing.join(', ')}. See server/.env.example.`,
      )
    }
  }
  return { ...env, SESSION_SECRET: env.SESSION_SECRET ?? DEVELOPMENT_SECRET }
}
