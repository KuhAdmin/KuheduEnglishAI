import { healthSchema } from '@kuhedu/contracts'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Db } from './db/client.ts'
import type { Mailer } from './lib/mailer.ts'
import type { GoogleSignIn } from './modules/auth/google.ts'
import { authRoutes } from './modules/auth/routes.ts'
import type { Grader } from './modules/conversation/grader.ts'
import type { Listener } from './modules/conversation/listener.ts'
import { adminLessonRoutes, lessonRoutes } from './modules/content/routes.ts'
import { conversationRoutes } from './modules/conversation/routes.ts'
import { meRoutes } from './modules/me/routes.ts'
import { pronunciationRoutes } from './modules/pronunciation/routes.ts'
import type { Scorer } from './modules/pronunciation/scorer.ts'
import { speechRoutes } from './modules/speech/routes.ts'
import type { SoundCache } from './modules/speech/soundCache.ts'
import type { Speaker } from './modules/speech/speaker.ts'
import { registerErrorHandling } from './plugins/errors.ts'
import { registerSecurity } from './plugins/security.ts'
import { registerSessions } from './plugins/session.ts'

/** What the routes over the database need. Without it the app only answers the health check. */
export type AppServices = {
  db: Db
  mailer: Mailer
  /** Keys the hashes of emailed codes (`SESSION_SECRET`). */
  secret: string
  /** Real people use this server (`NODE_ENV=production`). */
  production: boolean
  /** Present once Google sign-in is set up. */
  google?: GoogleSignIn
  /** Requests one address may make to each account route in a minute. */
  authRequestsPerMinute?: number
  /**
   * What checks a learner's recording of a word. It is among the services because the route
   * needs to know who is asking; without it a recording cannot be checked, and the app says so.
   */
  scorer?: Scorer
  /** Recordings one learner may have checked in a minute. */
  pronunciationRequestsPerMinute?: number
  /**
   * What checks a learner's spoken reply in a role-play: one writes down what was said, the
   * other reads it as a teacher would. Without them a reply cannot be checked, and the app says so.
   */
  replies?: { listener: Listener; grader: Grader }
  /** Replies one learner may have checked in a minute. */
  replyRequestsPerMinute?: number
  /** Requests one learner may make to what is kept of them in a minute. */
  meRequestsPerMinute?: number
  /** Weeks of lessons one address may ask for in a minute. */
  lessonRequestsPerMinute?: number
}

/** What the speaking routes need. Without it the app has no voices, and is silent. */
export type SpeechServices = {
  speaker: Speaker
  cache: SoundCache
  /** Sounds one address may ask for in a minute. */
  requestsPerMinute?: number
}

export type AppOptions = {
  /** Whether the database answers; the health check reports it. */
  checkDatabase: () => Promise<boolean>
  logger?: FastifyServerOptions['logger']
  /** Read the caller's address and `https` from what the server in front forwards. */
  trustProxy?: boolean
  services?: AppServices
  speech?: SpeechServices
}

const AUTH_REQUESTS_PER_MINUTE = 10
// A day of lessons is some dozens of sentences, and a classroom may share one address.
const SPEECH_REQUESTS_PER_MINUTE = 240
// A word said, listened to and said again takes several seconds; each check is half a second of
// the server's processor.
const PRONUNCIATION_REQUESTS_PER_MINUTE = 20
// A turn of a role-play takes a learner several seconds; each check is three or four seconds of
// the server's processor.
const REPLY_REQUESTS_PER_MINUTE = 10
// A setting changed, a day finished, an answer in the placement test: each is one small request,
// and a phone that was offline sends what it kept all at once.
const ME_REQUESTS_PER_MINUTE = 120
// A learner opens a week, then its days; a classroom may share one address.
const LESSON_REQUESTS_PER_MINUTE = 240

/**
 * The HTTP application, with nothing started: tests drive it with `inject`, `index.ts` makes
 * it listen. Every route says with Zod schemas (from `@kuhedu/contracts`, shared with the app)
 * what it takes and what it answers, and both are enforced.
 */
export function buildApp({
  checkDatabase,
  logger = false,
  trustProxy = false,
  services,
  speech,
}: AppOptions) {
  const app = Fastify({ logger, trustProxy }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(app)
  // Before the session is looked up: a request from another site is not worth a query.
  registerSecurity(app)

  // For the people and the tools that run the server; holds nothing about anyone.
  app.get('/api/health', { schema: { response: { 200: healthSchema } } }, async () => ({
    status: 'ok' as const,
    database: (await checkDatabase()) ? ('ok' as const) : ('down' as const),
    time: new Date().toISOString(),
  }))

  // Needs no database and asks for no account: a sound says nothing about anyone.
  if (speech) {
    void app.register(speechRoutes, {
      prefix: '/api/speech',
      speaker: speech.speaker,
      cache: speech.cache,
      requestsPerMinute: speech.requestsPerMinute ?? SPEECH_REQUESTS_PER_MINUTE,
      logError: (error) => app.log.error(error),
    })
  }

  if (services) {
    const { db, mailer, secret, production, google } = services
    const sessions = registerSessions(app, { db, production })
    void app.register(authRoutes, {
      prefix: '/api/auth',
      db,
      mailer,
      secret,
      sessions,
      google,
      production,
      requestsPerMinute: services.authRequestsPerMinute ?? AUTH_REQUESTS_PER_MINUTE,
      logError: (error) => app.log.error(error),
    })
    // A week's lesson content: anyone's to read, an admin's to write.
    void app.register(lessonRoutes, {
      prefix: '/api/lessons',
      db,
      requestsPerMinute: services.lessonRequestsPerMinute ?? LESSON_REQUESTS_PER_MINUTE,
    })
    void app.register(adminLessonRoutes, { prefix: '/api/admin/lessons', db })
    void app.register(meRoutes, {
      prefix: '/api/me',
      db,
      requestsPerMinute: services.meRequestsPerMinute ?? ME_REQUESTS_PER_MINUTE,
    })
    if (services.scorer) {
      void app.register(pronunciationRoutes, {
        prefix: '/api/pronunciation',
        scorer: services.scorer,
        requestsPerMinute:
          services.pronunciationRequestsPerMinute ?? PRONUNCIATION_REQUESTS_PER_MINUTE,
        logError: (error) => app.log.error(error),
      })
    }
    if (services.replies) {
      void app.register(conversationRoutes, {
        prefix: '/api/conversation',
        listener: services.replies.listener,
        grader: services.replies.grader,
        requestsPerMinute: services.replyRequestsPerMinute ?? REPLY_REQUESTS_PER_MINUTE,
        logError: (error) => app.log.error(error),
      })
    }
  }

  return app
}

export type App = ReturnType<typeof buildApp>
