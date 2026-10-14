import {
  appConfigParamsSchema,
  appConfigRemoveSchema,
  appConfigResponseSchema,
  appConfigSavedSchema,
  appConfigSaveSchema,
  noContentSchema,
  storedAppConfigSchema,
  textChangesSchema,
  textScopeParamsSchema,
} from '@kuhedu/contracts'
import type { FastifyReply } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Db } from '../../db/client.ts'
import { requireAdmin } from '../../plugins/session.ts'
import * as settings from './settings.ts'

export type AppConfigRoutesOptions = {
  db: Db
  /** Times one address may ask in a minute. */
  requestsPerMinute: number
}

/**
 * `GET /api/app-config`: what an admin wrote for the landing page, the languages, the profile
 * pictures, the screen texts and the course's wording, for anyone. The landing page and the
 * account screens read it before anyone is signed in, so it asks for no account; it says
 * nothing about anyone.
 */
export const appConfigRoutes: FastifyPluginAsyncZod<AppConfigRoutesOptions> = async (
  app,
  { db, requestsPerMinute },
) => {
  app.get(
    '/',
    {
      config: { rateLimit: { max: requestsPerMinute, timeWindow: '1 minute' } },
      schema: { response: { 200: appConfigResponseSchema } },
    },
    async (request, reply) => {
      const { body, etag } = await settings.readPublic(db)
      // Asked about each time: an admin's change must reach a learner at their next look, and
      // settings that have not changed cost a learner's connection almost nothing.
      void reply.header('Cache-Control', 'no-cache').header('ETag', etag)
      if (request.headers['if-none-match'] === etag) {
        return (reply as FastifyReply).status(304).send()
      }
      return body
    },
  )
}

/**
 * The most a settings object weighs. Pictures are still kept inside them (the landing page's,
 * the flags, six profile pictures), as the admin area makes them: `TODO(assets)`.
 */
const SETTING_BYTES_MAX = 4_000_000
/** Every course text and every screen text in three languages, at their longest. */
const TEXT_CHANGES_BYTES_MAX = 3_000_000

export type AdminAppConfigRoutesOptions = { db: Db }

/** `/api/admin/app-config/*`: admins only, checked before anything of the request is read. */
export const adminAppConfigRoutes: FastifyPluginAsyncZod<AdminAppConfigRoutesOptions> = async (
  app,
  { db },
) => {
  app.addHook('onRequest', requireAdmin)

  app.get('/', { schema: { response: { 200: storedAppConfigSchema } } }, async () =>
    settings.readStored(db),
  )

  app.put(
    '/:name',
    {
      bodyLimit: SETTING_BYTES_MAX,
      schema: {
        params: appConfigParamsSchema,
        body: appConfigSaveSchema,
        response: { 200: appConfigSavedSchema },
      },
    },
    async (request) => ({
      version: await settings.saveSetting(db, {
        name: request.params.name,
        value: request.body.value,
        basedOn: request.body.version,
        by: request.user?.id ?? null,
      }),
    }),
  )

  app.delete(
    '/:name',
    {
      schema: {
        params: appConfigParamsSchema,
        querystring: appConfigRemoveSchema,
        response: { 204: noContentSchema },
      },
    },
    async (request, reply) => {
      await settings.removeSetting(db, {
        name: request.params.name,
        basedOn: request.query.version,
        by: request.user?.id ?? null,
      })
      return reply.status(204).send(null)
    },
  )

  app.patch(
    '/texts/:scope',
    {
      bodyLimit: TEXT_CHANGES_BYTES_MAX,
      schema: {
        params: textScopeParamsSchema,
        body: textChangesSchema,
        response: { 204: noContentSchema },
      },
    },
    async (request, reply) => {
      await settings.changeTexts(db, {
        scope: request.params.scope,
        changes: request.body.changes,
        by: request.user?.id ?? null,
      })
      return reply.status(204).send(null)
    },
  )
}
