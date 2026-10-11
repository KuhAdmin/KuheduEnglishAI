import { z } from 'zod'

/**
 * Why a request failed, as a word the app can act on. The HTTP status says the same more
 * coarsely; `message` is for logs and developers, never shown to a learner.
 */
export const API_ERROR_CODES = [
  'validation_failed',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  // Something the server leans on is not answering (the speaking service): try again later.
  'unavailable',
  'internal',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

/** The body of every failed response from the server, whatever went wrong. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    /** For a form: which field is at fault, and the screen-text key that says why. */
    fields: z.record(z.string(), z.string()).optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorSchema>
