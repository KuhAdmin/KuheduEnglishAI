import { fileURLToPath } from 'node:url'
import { buildApp } from './app.ts'
import { connectDatabase } from './db/client.ts'
import { readEnv } from './env.ts'
import { createMailer } from './lib/mailer.ts'
import { createGoogleSignIn } from './modules/auth/google.ts'
import { createSoundCache } from './modules/speech/soundCache.ts'
import { createSpeaker } from './modules/speech/speaker.ts'

const env = readEnv()
const database = connectDatabase(env)
// The mailer is made before the app whose log it writes to.
let logLine: (line: string) => void = () => {}
const mailer = await createMailer(env, (line) => logLine(line))
const app = buildApp({
  checkDatabase: database.check,
  logger: env.NODE_ENV === 'test' ? false : { level: 'info' },
  trustProxy: env.TRUST_PROXY === 'true',
  services: {
    db: database.db,
    mailer,
    secret: env.SESSION_SECRET,
    production: env.NODE_ENV === 'production',
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? createGoogleSignIn(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
        : undefined,
  },
  speech: {
    speaker: createSpeaker(env.SPEECH_URL),
    cache: createSoundCache(
      env.SPEECH_CACHE_DIR ?? fileURLToPath(new URL('../var/speech', import.meta.url)),
    ),
  },
})
logLine = (line) => app.log.info(line)

// Let requests under way finish, then let go of the database, when the process is told to stop.
let stopping = false
const stop = async () => {
  if (stopping) return
  stopping = true
  await app.close()
  await database.close()
}
process.once('SIGINT', () => void stop())
process.once('SIGTERM', () => void stop())

try {
  await app.listen({ host: env.HOST, port: env.PORT })
  if (!(await database.check())) {
    app.log.warn(`The database "${env.PGDATABASE}" on ${env.PGHOST} is not answering.`)
  }
} catch (error) {
  app.log.error(error)
  await database.close()
  process.exitCode = 1
}
