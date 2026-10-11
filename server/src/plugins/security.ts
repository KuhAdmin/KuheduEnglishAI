import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import { HttpError } from './errors.ts'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Whether an `Origin` header names the very host the request was sent to. */
function isOwnOrigin(origin: string, host: string): boolean {
  try {
    const from = new URL(origin)
    // Written with the origin's scheme, so that `:443` or `:80` spelled out on one side only
    // does not make the same host look like two.
    return from.host === new URL(`${from.protocol}//${host}`).host
  } catch {
    return false
  }
}

/**
 * What stands between the routes and a hostile page or a flood.
 *
 * A request that changes something must come from the app's own pages. Browsers say where a
 * request comes from (`Sec-Fetch-Site`, `Origin`) and a page cannot forge either, so another
 * site's form or script is turned away here even if the browser were to send the cookie. A
 * caller that says nothing (a script, a test) carries no one's cookie by accident and is let by.
 */
export function registerSecurity(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    if (SAFE_METHODS.has(request.method)) return
    const site = request.headers['sec-fetch-site']
    const origin = request.headers.origin
    const foreign =
      (typeof site === 'string' && site !== 'same-origin' && site !== 'none') ||
      (typeof origin === 'string' && !isOwnOrigin(origin, request.host))
    if (foreign) throw new HttpError(403, 'forbidden', 'This request came from another site')
  })

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('Cross-Origin-Resource-Policy', 'same-origin')
    // Answers are about one person or one moment; nothing between here and the app keeps them.
    // A route that may be cached says so itself.
    if (!reply.hasHeader('Cache-Control')) reply.header('Cache-Control', 'no-store')
  })

  // Counted in this process's memory, which is right for one process. Routes opt in with
  // `config: { rateLimit }`; the refusal reaches the caller as `rate_limited`.
  void app.register(rateLimit, { global: false })
}
