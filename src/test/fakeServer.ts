import type { ApiErrorCode } from '@kuhedu/contracts'
import { vi } from 'vitest'

/** What the stand-in answers: `body` alone is a 200, nothing at all a 204. */
export type FakeAnswer = { status?: number; body?: unknown }
export type FakeCall = { method: string; path: string; body: unknown }
type FakeRoute = FakeAnswer | ((body: unknown) => FakeAnswer)

/** A refusal in the server's one shape for failures. */
export const refusal = (
  status: number,
  code: ApiErrorCode,
  fields?: Record<string, string>,
): FakeAnswer => ({ status, body: { error: { code, message: code, ...(fields && { fields }) } } })

/**
 * Stand in for the backend in a unit test. `routes` answers by method and path under `/api`
 * (`'POST /auth/sign-in'`); anything not listed gets the server's own 404. The routes can be
 * changed while the test runs, and `calls` is everything the app asked for. Undo it with
 * `vi.unstubAllGlobals()`.
 */
export function fakeServer(routes: Record<string, FakeRoute> = {}) {
  const calls: FakeCall[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input).replace(/^\/api/, '')
      const method = init?.method ?? 'GET'
      const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ method, path, body })

      const route = routes[`${method} ${path}`] ?? refusal(404, 'not_found')
      const answer = typeof route === 'function' ? route(body) : route
      const status = answer.status ?? (answer.body === undefined ? 204 : 200)
      return new Response(status === 204 ? null : JSON.stringify(answer.body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    }),
  )

  return { routes, calls }
}

/** No server to reach: every request fails as it does offline. */
export function serverUnreachable() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }),
  )
}
