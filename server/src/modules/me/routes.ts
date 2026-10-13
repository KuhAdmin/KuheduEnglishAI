import {
  LEARNER_PHOTO_MAX,
  learnerDataSchema,
  learnerPhotoSavedSchema,
  learnerPhotoSchema,
  learnerProfilePatchSchema,
  learnerProfileSchema,
  lessonMarksRequestSchema,
  noContentSchema,
  placementClientIdSchema,
  placementSaveSchema,
} from '@kuhedu/contracts'
import type { FastifyRequest } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { Db } from '../../db/client.ts'
import { HttpError } from '../../plugins/errors.ts'
import { requireVerified } from '../../plugins/session.ts'
import * as me from './service.ts'

export type MeRoutesOptions = {
  db: Db
  /** Requests one learner may make to these routes in a minute. */
  requestsPerMinute: number
}

/**
 * `/api/me/*`: what is kept of the learner who is asking, with their account: how they set the
 * app up, their photo, how far they are in the lessons, their placement test.
 *
 * **Whose it is comes from the session and from nowhere else**, and only for an account whose
 * address is verified: no address, body or id in a request names a learner.
 */
export const meRoutes: FastifyPluginAsyncZod<MeRoutesOptions> = async (app, options) => {
  const { db, requestsPerMinute } = options
  const theirs = {
    // Before the body is read or checked: nobody is told what was wrong with a request they
    // may not make, and a photo is not taken in from someone who may not send one.
    onRequest: requireVerified,
    config: {
      rateLimit: {
        max: requestsPerMinute,
        timeWindow: '1 minute',
        // By the learner: a classroom may share an address.
        keyGenerator: (request: FastifyRequest) => request.user?.id ?? request.ip,
      },
    },
  }
  // Set by `requireVerified`; the type cannot know that.
  const who = (request: FastifyRequest): string => {
    if (!request.user) throw new HttpError(401, 'unauthenticated', 'Sign in first')
    return request.user.id
  }

  app.get('/', { ...theirs, schema: { response: { 200: learnerDataSchema } } }, async (request) => {
    const userId = who(request)
    const [profile, progress, placement] = await Promise.all([
      me.readProfile(db, userId),
      me.readProgress(db, userId),
      me.readPlacement(db, userId),
    ])
    return { profile, progress, placement }
  })

  app.patch(
    '/profile',
    {
      ...theirs,
      schema: { body: learnerProfilePatchSchema, response: { 200: learnerProfileSchema } },
    },
    async (request) => me.saveProfile(db, who(request), request.body),
  )

  app.get(
    '/photo',
    { ...theirs, schema: { response: { 200: learnerPhotoSchema } } },
    async (request) => me.readPhoto(db, who(request)),
  )

  app.put(
    '/photo',
    {
      ...theirs,
      // A picture is the one thing here that is heavier than the framework lets a body be.
      bodyLimit: LEARNER_PHOTO_MAX + 1024,
      schema: { body: learnerPhotoSchema, response: { 200: learnerPhotoSavedSchema } },
    },
    async (request) => me.savePhoto(db, who(request), request.body.photo),
  )

  app.delete(
    '/photo',
    { ...theirs, schema: { response: { 204: noContentSchema } } },
    async (request, reply) => {
      await me.removePhoto(db, who(request))
      return reply.status(204).send(null)
    },
  )

  app.post(
    '/progress/marks',
    {
      ...theirs,
      schema: { body: lessonMarksRequestSchema, response: { 204: noContentSchema } },
    },
    async (request, reply) => {
      await me.addMarks(db, who(request), request.body.marks)
      return reply.status(204).send(null)
    },
  )

  app.put(
    '/placement/sessions/:clientId',
    {
      ...theirs,
      schema: {
        params: z.object({ clientId: placementClientIdSchema }),
        body: placementSaveSchema,
        response: { 204: noContentSchema },
      },
    },
    async (request, reply) => {
      await me.savePlacement(db, who(request), request.params.clientId, request.body)
      return reply.status(204).send(null)
    },
  )
}
