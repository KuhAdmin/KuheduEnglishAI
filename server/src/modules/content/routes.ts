import {
  noContentSchema,
  storedLessonsSchema,
  weekContentParamsSchema,
  weekContentRemoveSchema,
  weekContentSavedSchema,
  weekContentSaveSchema,
  weekLessonsResponseSchema,
  weekParamsSchema,
} from '@kuhedu/contracts'
import type { FastifyReply } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Db } from '../../db/client.ts'
import { requireAdmin } from '../../plugins/session.ts'
import * as lessons from './lessons.ts'

export type LessonRoutesOptions = {
  db: Db
  /** Weeks one address may ask for in a minute. */
  requestsPerMinute: number
}

/**
 * `/api/lessons/*`: a week's lesson content, for anyone. It says nothing about anyone, so it
 * asks for no account, and a browser may keep its answer and ask whether it still stands.
 */
export const lessonRoutes: FastifyPluginAsyncZod<LessonRoutesOptions> = async (app, options) => {
  const { db, requestsPerMinute } = options

  app.get(
    '/weeks/:week',
    {
      config: { rateLimit: { max: requestsPerMinute, timeWindow: '1 minute' } },
      schema: { params: weekParamsSchema, response: { 200: weekLessonsResponseSchema } },
    },
    async (request, reply) => {
      const { week } = request.params
      const { content, etag } = await lessons.readWeek(db, week)
      // Kept, but asked about each time: an admin's change must reach a learner at their next
      // look, and a week that has not changed costs a learner's connection almost nothing.
      void reply.header('Cache-Control', 'no-cache').header('ETag', etag)
      // "Still stands" has nothing to send, which the answer's schema has no word for.
      if (request.headers['if-none-match'] === etag) {
        return (reply as FastifyReply).status(304).send()
      }
      return { week, content }
    },
  )
}

/**
 * The most a piece weighs. Pictures are still kept inside the content (a word's, a partner's,
 * the week's own), as the admin area makes them: `TODO(assets)`, upload them and keep an address.
 */
const PIECE_BYTES_MAX = 1_500_000

export type AdminLessonRoutesOptions = { db: Db }

/**
 * `/api/admin/lessons/*`: what an admin writes for a week. Admins only, checked before anything
 * of the request is read.
 */
export const adminLessonRoutes: FastifyPluginAsyncZod<AdminLessonRoutesOptions> = async (
  app,
  { db },
) => {
  app.addHook('onRequest', requireAdmin)

  app.get('/', { schema: { response: { 200: storedLessonsSchema } } }, async () =>
    lessons.readAll(db),
  )

  app.put(
    '/weeks/:week/:kind',
    {
      bodyLimit: PIECE_BYTES_MAX,
      schema: {
        params: weekContentParamsSchema,
        body: weekContentSaveSchema,
        response: { 200: weekContentSavedSchema },
      },
    },
    async (request) => ({
      version: await lessons.savePiece(db, {
        ...request.params,
        value: request.body.value,
        basedOn: request.body.version,
        by: request.user?.id ?? null,
      }),
    }),
  )

  app.delete(
    '/weeks/:week/:kind',
    {
      schema: {
        params: weekContentParamsSchema,
        querystring: weekContentRemoveSchema,
        response: { 204: noContentSchema },
      },
    },
    async (request, reply) => {
      await lessons.removePiece(db, {
        ...request.params,
        basedOn: request.query.version,
        by: request.user?.id ?? null,
      })
      return reply.status(204).send(null)
    },
  )
}
