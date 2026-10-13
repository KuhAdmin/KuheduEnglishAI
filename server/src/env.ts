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

  // Sending the codes. One of the two ways is enough; with neither, development writes each
  // code to the server's log instead of sending it.
  /** Resend's key: the codes go through Resend. A secret. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /** The address Resend sends as; its domain must be verified with Resend. Left out: `MAIL_FROM`. */
  RESEND_FROM_EMAIL: z.string().min(1).optional(),
  /**
   * Or a mail server, with the account that may send as `MAIL_FROM`
   * (`smtp://user:password@host:587`). A secret.
   */
  SMTP_URL: z.string().min(1).optional(),
  /** Who the codes come from. Whatever sends them must be allowed to send as this address. */
  MAIL_FROM: z.string().min(1).default('Kuhedu Lingo <hello@lingo.kuhedu.com>'),

  /**
   * Google sign-in is offered only when both of these are set (and the app is built with
   * `VITE_GOOGLE_CLIENT_ID`). The id is public. The Google client must list
   * `<the app's address>/api/auth/google/callback` among its authorized redirect URIs.
   */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  /** What the server trades Google's code with. A secret. */
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  /** Where the speaking service (`speech/tts`, `npm run dev:speech`) listens, on this machine. */
  SPEECH_URL: z.url().default('http://127.0.0.1:8788'),
  /** Where sounds already made are kept. Left out, a folder beside the server's code. */
  SPEECH_CACHE_DIR: z.string().min(1).optional(),

  /** Where the scoring service (`speech/assess`, `npm run dev:scorer`) listens, on this machine. */
  SCORER_URL: z.url().default('http://127.0.0.1:8789'),

  /** Where Ollama listens, on this machine: it runs the model that reads a learner's reply. */
  GRADER_URL: z.url().default('http://127.0.0.1:11434'),
  /** That model, by the name Ollama has it under. Another one has to be measured before it is used. */
  GRADER_MODEL: z.string().min(1).default('qwen2.5:1.5b'),
})

/** What a server that real people use cannot do without; development has stand-ins for them. */
const REQUIRED_IN_PRODUCTION = ['SESSION_SECRET'] as const
/** And a way to send the codes: either of these. */
const WAYS_TO_SEND = ['RESEND_API_KEY', 'SMTP_URL'] as const

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
  // One without the other is a set-up left half done, which would otherwise show only as a
  // button that says Google is not available.
  if ((env.GOOGLE_CLIENT_ID === undefined) !== (env.GOOGLE_CLIENT_SECRET === undefined)) {
    throw new Error(
      'Server settings: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together. See server/.env.example.',
    )
  }
  if (env.NODE_ENV === 'production') {
    const missing: string[] = REQUIRED_IN_PRODUCTION.filter((name) => env[name] === undefined)
    if (WAYS_TO_SEND.every((name) => env[name] === undefined)) {
      missing.push(WAYS_TO_SEND.join(' or '))
    }
    if (missing.length > 0) {
      throw new Error(
        `Server settings needed in production: ${missing.join(', ')}. See server/.env.example.`,
      )
    }
  }
  return { ...env, SESSION_SECRET: env.SESSION_SECRET ?? DEVELOPMENT_SECRET }
}
