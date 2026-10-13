import { apiErrorSchema, type ApiErrorCode } from '@kuhedu/contracts'
import type { z } from 'zod'
import { env } from '../env'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  /** Why the server refused, in its own word; `undefined` when the answer was not the server's. */
  readonly code: ApiErrorCode | undefined
  /** For a form: the field at fault and the screen-text key that says why. */
  readonly fields: Readonly<Record<string, string>>

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    // A proxy or a dead server answers in shapes of its own; only ours is read.
    const parsed = apiErrorSchema.safeParse(body)
    this.code = parsed.success ? parsed.data.error.code : undefined
    this.fields = (parsed.success && parsed.data.error.fields) || {}
  }
}

type RequestOptions<TSchema extends z.ZodType> = Omit<RequestInit, 'body'> & {
  /** Every response is validated at the boundary. */
  schema: TSchema
  /** Sent as JSON. */
  body?: unknown
  /** Sent as it is, under the type it says it is: a recording, which is not JSON. */
  blob?: Blob
}

/**
 * Thin fetch wrapper for the Kuhedu backend. AI provider calls always go through the backend;
 * the browser never holds provider keys.
 */
export async function apiRequest<TSchema extends z.ZodType>(
  path: string,
  { schema, body, blob, headers, ...init }: RequestOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const response = await fetch(`${env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(blob && { 'Content-Type': blob.type }),
      ...headers,
    },
    body: blob ?? (body === undefined ? undefined : JSON.stringify(body)),
  })

  const data: unknown = response.status === 204 ? null : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(response.status, `Request to ${path} failed (${response.status})`, data)
  }

  return schema.parse(data)
}
