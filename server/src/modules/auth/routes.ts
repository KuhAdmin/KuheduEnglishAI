import {
  authSessionSchema,
  forgotPasswordRequestSchema,
  googleSignInRequestSchema,
  noContentSchema,
  resetPasswordRequestSchema,
  signInRequestSchema,
  signUpRequestSchema,
  verifyEmailRequestSchema,
  type SessionUser,
} from '@kuhedu/contracts'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { HttpError } from '../../plugins/errors.ts'
import { requireUser, type Sessions } from '../../plugins/session.ts'
import type { GoogleVerifier } from './google.ts'
import * as auth from './service.ts'
import { revokeSession } from './sessions.ts'

export type AuthRoutesOptions = auth.AuthDeps & {
  sessions: Sessions
  /** Absent until Google sign-in is set up: the route then does not exist for the caller. */
  verifyGoogle?: GoogleVerifier
  /** Requests one address may make to each of these routes in a minute. */
  requestsPerMinute: number
}

/** `/api/auth/*`: who is signed in, and the ways of becoming so. */
export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, options) => {
  const { sessions, verifyGoogle, requestsPerMinute, ...deps } = options
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

  if (verifyGoogle) {
    app.post(
      '/google',
      {
        config: limited,
        schema: { body: googleSignInRequestSchema, response: { 200: authSessionSchema } },
      },
      async (request, reply) => {
        const identity = await verifyGoogle(request.body.credential)
        if (!identity) throw new HttpError(401, 'unauthenticated', 'Google did not vouch for this')
        const { user, token } = await auth.signInWithGoogle(
          deps,
          identity,
          request.headers['user-agent'],
        )
        await begin(request, reply, token)
        return { user }
      },
    )
  }
}
