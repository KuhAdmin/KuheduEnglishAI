import type { z } from 'zod'
import { env } from '../env'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

type RequestOptions<TSchema extends z.ZodType> = Omit<RequestInit, 'body'> & {
  /** Every response is validated at the boundary. */
  schema: TSchema
  body?: unknown
}

/**
 * Thin fetch wrapper for the Kuhedu backend. AI provider calls always go through the backend;
 * the browser never holds provider keys.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  { schema, body, headers, ...init }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed (${response.status})`, data)
  }

  return schema.parse(data)
}
