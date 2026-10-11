import type { ApiErrorBody, ApiErrorCode } from '@kuhedu/contracts'
import type { FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod'

/** A failure a route chose: it is told to the caller as it is. Anything else is "internal". */
export class HttpError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly fields?: Record<string, string>

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

const body = (
  code: ApiErrorCode,
  message: string,
  fields?: Record<string, string>,
): ApiErrorBody => ({ error: fields ? { code, message, fields } : { code, message } })

const codeForStatus = (status: number): ApiErrorCode =>
  status === 401
    ? 'unauthenticated'
    : status === 403
      ? 'forbidden'
      : status === 404
        ? 'not_found'
        : status === 409
          ? 'conflict'
          : status === 429
            ? 'rate_limited'
            : 'validation_failed'

/**
 * Every failure leaves in the one shape the app parses (`apiErrorSchema`). What went wrong
 * inside the server is logged, never sent: the caller of a 500 learns nothing but that.
 */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send(body('not_found', `Nothing at ${request.method} ${request.url}`)),
  )

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.status).send(body(error.code, error.message, error.fields))
    }
    if (hasZodFastifySchemaValidationErrors(error)) {
      const fields: Record<string, string> = {}
      for (const issue of error.validation) {
        const field = issue.instancePath.replace(/^\//, '').replaceAll('/', '.') || '_'
        fields[field] = issue.message ?? 'invalid'
      }
      return reply.status(400).send(body('validation_failed', 'The request is not valid', fields))
    }

    const status = (error as { statusCode?: unknown }).statusCode
    if (typeof status === 'number' && status >= 400 && status < 500) {
      // A malformed request the framework itself refused (bad JSON, a body too large).
      return reply.status(status).send(body(codeForStatus(status), 'The request was refused'))
    }

    request.log.error(error)
    return reply.status(500).send(body('internal', 'Something went wrong on the server'))
  })
}
