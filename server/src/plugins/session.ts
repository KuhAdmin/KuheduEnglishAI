import cookie from '@fastify/cookie'
import type { SessionUser } from '@kuhedu/contracts'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from '../db/client.ts'
import { findSession, SESSION_LIFETIME_MS } from '../modules/auth/sessions.ts'
import { HttpError } from './errors.ts'

const SESSION_COOKIE = 'kuhedu_session'

declare module 'fastify' {
  interface FastifyRequest {
    /** Who is asking; `null` when nobody is signed in. */
    user: SessionUser | null
    sessionId: string | null
  }
}

type SessionOptions = {
  db: Db
  /** Real people use this server: its cookie is then only ever sent over HTTPS. */
  production: boolean
}

/**
 * The cookie that signs a browser in. Page scripts cannot read it (`HttpOnly`), other sites'
 * requests do not carry it (`SameSite=Lax`, with the `Origin` check in `security.ts` behind it),
 * and it travels over HTTPS wherever there is HTTPS. On the plain `http` development server it
 * goes without `Secure`, or signing in could not be tried on a phone over the LAN.
 */
export function registerSessions(app: FastifyInstance, { db, production }: SessionOptions) {
  const cookieOptions = (request: FastifyRequest) => ({
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: production || request.protocol === 'https',
  })

  const setCookie = (request: FastifyRequest, reply: FastifyReply, token: string) =>
    reply.setCookie(SESSION_COOKIE, token, {
      ...cookieOptions(request),
      maxAge: SESSION_LIFETIME_MS / 1000,
    })

  void app.register(cookie)
  app.decorateRequest('user', null)
  app.decorateRequest('sessionId', null)

  app.addHook('onRequest', async (request, reply) => {
    // Read from the header here, so this does not depend on the cookie plugin's own hook
    // having run first.
    const token = app.parseCookie(request.headers.cookie ?? '')[SESSION_COOKIE]
    if (!token) return
    const found = await findSession(db, token)
    if (!found) {
      // Run out, revoked, or the account disabled: stop sending it.
      reply.clearCookie(SESSION_COOKIE, cookieOptions(request))
      return
    }
    request.user = found.user
    request.sessionId = found.sessionId
    if (found.renewed) setCookie(request, reply, token)
  })

  return {
    /** Sign this browser in with a token from `createSession`. */
    start: setCookie,
    /** Stop the browser sending its cookie. Revoking the session is the caller's to do. */
    end: (request: FastifyRequest, reply: FastifyReply) =>
      reply.clearCookie(SESSION_COOKIE, cookieOptions(request)),
  }
}

export type Sessions = ReturnType<typeof registerSessions>

/** `preHandler`: only someone signed in gets further. */
export async function requireUser(request: FastifyRequest) {
  if (!request.user) throw new HttpError(401, 'unauthenticated', 'Sign in first')
}

/**
 * `preHandler`: only someone whose address is verified gets further. Until the emailed code has
 * been matched an account is not finished being made: nothing of a learner's own is kept for it
 * or given out to it. **Every route for a learner's data uses this, not `requireUser`.**
 */
export async function requireVerified(request: FastifyRequest) {
  await requireUser(request)
  if (!request.user?.emailVerified) {
    throw new HttpError(403, 'forbidden', 'Verify your email address first')
  }
}

/** `preHandler`: only an admin gets further. */
export async function requireAdmin(request: FastifyRequest) {
  await requireUser(request)
  if (request.user?.role !== 'admin') throw new HttpError(403, 'forbidden', 'Admins only')
}
