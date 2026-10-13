import { randomBytes, timingSafeEqual } from 'node:crypto'
import {
  authSessionSchema,
  forgotPasswordRequestSchema,
  noContentSchema,
  resetPasswordRequestSchema,
  signInRequestSchema,
  signUpRequestSchema,
  verifyEmailRequestSchema,
  type SessionUser,
} from '@kuhedu/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { HttpError } from '../../plugins/errors.ts'
import { requireUser, type Sessions } from '../../plugins/session.ts'
import type { GoogleSignIn } from './google.ts'
import * as auth from './service.ts'
import { revokeSession } from './sessions.ts'

export type AuthRoutesOptions = auth.AuthDeps & {
  sessions: Sessions
  /** Absent until Google sign-in is set up: its routes then do not exist for the caller. */
  google?: GoogleSignIn
  /** Real people use this server: its cookies are then only ever sent over HTTPS. */
  production: boolean
  /** Requests one address may make to each of these routes in a minute. */
  requestsPerMinute: number
}

// Kept by the browser while it is away on Google's page: what must come back with it.
const GOOGLE_COOKIE = 'kuhedu_google'
/** How long someone has to come back from Google's page. */
const GOOGLE_WAIT_S = 10 * 60

// Where the browser is sent once Google has answered. These are the app's addresses (its
// `paths`): the front door, which sends a learner on from where they left off; the admin area;
// and the account screen, which says that it did not work when told so.
const APP = { frontDoor: '/', admin: '/admin', signIn: '/sign-in' } as const
const GOOGLE_FAILED = `${APP.signIn}?google=failed`

/** What Google's page sends back with the browser. Anything else it adds is not read. */
const googleCallbackQuerySchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  state: z.string().min(1).max(512).optional(),
})

const sameText = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** `/api/auth/*`: who is signed in, and the ways of becoming so. */
export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, options) => {
  const { sessions, google, production, requestsPerMinute, ...deps } = options
  const limited = { rateLimit: { max: requestsPerMinute, timeWindow: '1 minute' } }
  // Set by `requireUser`; the type cannot know that.
  const signedIn = (user: SessionUser | null): SessionUser => {
    if (!user) throw new HttpError(401, 'unauthenticated', 'Sign in first')
    return user
  }
  /** The browser is now this account's; whoever it was signed in as before is signed out of it. */
  const begin = async (request: FastifyRequest, reply: FastifyReply, token: string) => {
    if (request.sessionId) await revokeSession(deps.db, request.sessionId)
    sessions.start(request, reply, token)
  }

  app.get('/session', { schema: { response: { 200: authSessionSchema } } }, async (request) => ({
    user: request.user,
  }))

  app.post(
    '/sign-up',
    {
      config: limited,
      schema: { body: signUpRequestSchema, response: { 201: authSessionSchema } },
    },
    async (request, reply) => {
      const { user, token } = await auth.signUp(deps, request.body, request.headers['user-agent'])
      await begin(request, reply, token)
      return reply.status(201).send({ user })
    },
  )

  app.post(
    '/sign-in',
    {
      config: limited,
      schema: { body: signInRequestSchema, response: { 200: authSessionSchema } },
    },
    async (request, reply) => {
      const { user, token } = await auth.signIn(deps, request.body, request.headers['user-agent'])
      await begin(request, reply, token)
      return { user }
    },
  )

  app.post(
    '/sign-out',
    { schema: { response: { 204: noContentSchema } } },
    async (request, reply) => {
      if (request.sessionId) await revokeSession(deps.db, request.sessionId)
      sessions.end(request, reply)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/verify-email',
    {
      config: limited,
      preHandler: requireUser,
      schema: { body: verifyEmailRequestSchema, response: { 204: noContentSchema } },
    },
    async (request, reply) => {
      await auth.verifyEmail(deps, signedIn(request.user), request.body.code)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/verify-email/resend',
    { config: limited, preHandler: requireUser, schema: { response: { 204: noContentSchema } } },
    async (request, reply) => {
      await auth.resendVerification(deps, signedIn(request.user))
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/password/forgot',
    {
      config: limited,
      schema: { body: forgotPasswordRequestSchema, response: { 204: noContentSchema } },
    },
    async (request, reply) => {
      await auth.forgotPassword(deps, request.body.email)
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/password/reset',
    {
      config: limited,
      schema: { body: resetPasswordRequestSchema, response: { 204: noContentSchema } },
    },
    async (request, reply) => {
      await auth.resetPassword(deps, request.body)
      return reply.status(204).send(null)
    },
  )

  if (google) {
    // Both are addresses the browser itself is sent to, not calls the app makes: they answer
    // by sending it on, never with something for a screen to read.

    // The address Google sends the browser back to: this server, as the browser reached it
    // (through whatever stands in front, which passes the host on). It must be one of the
    // Google client's authorized redirect URIs, to the letter.
    const callbackUrl = (request: FastifyRequest) =>
      `${request.protocol}://${request.host}/api/auth/google/callback`
    const googleCookie = (request: FastifyRequest) => ({
      path: '/api/auth/google',
      httpOnly: true,
      // Lax, so that it comes back with the browser from Google's page.
      sameSite: 'lax' as const,
      secure: production || request.protocol === 'https',
    })

    app.get('/google/start', { config: limited }, async (request, reply) => {
      // `state` proves the answer belongs to a sign-in this browser began (another site cannot
      // sign someone in to an account of its choosing); `nonce` ties Google's answer to it.
      const state = randomBytes(24).toString('base64url')
      const nonce = randomBytes(24).toString('base64url')
      reply.setCookie(GOOGLE_COOKIE, `${state}.${nonce}`, {
        ...googleCookie(request),
        maxAge: GOOGLE_WAIT_S,
      })
      return reply.redirect(google.startUrl(callbackUrl(request), state, nonce))
    })

    app.get(
      '/google/callback',
      { config: limited, schema: { querystring: googleCallbackQuerySchema } },
      async (request, reply) => {
        const kept = app.parseCookie(request.headers.cookie ?? '')[GOOGLE_COOKIE] ?? ''
        const [state, nonce] = kept.split('.')
        reply.clearCookie(GOOGLE_COOKIE, googleCookie(request))

        const { code, state: returned } = request.query
        // They closed Google's page or said no: the account screen, with nothing to say.
        if (!code) return reply.redirect(APP.signIn)
        if (!state || !nonce || !returned || !sameText(state, returned)) {
          return reply.redirect(GOOGLE_FAILED)
        }

        try {
          const identity = await google.identify(code, callbackUrl(request), nonce)
          if (!identity) return await reply.redirect(GOOGLE_FAILED)
          const { user, token } = await auth.signInWithGoogle(
            deps,
            identity,
            request.headers['user-agent'],
          )
          await begin(request, reply, token)
          return await reply.redirect(user.role === 'admin' ? APP.admin : APP.frontDoor)
        } catch (error) {
          // A person is looking at this, not a screen of ours: whatever went wrong, they are
          // sent back to the account screen. What the server itself got wrong is logged.
          if (!(error instanceof HttpError)) deps.logError(error)
          return reply.redirect(GOOGLE_FAILED)
        }
      },
    )
  }
}
