import {
  SPEECH_MOUTH_HEADER,
  speechAudioQuerySchema,
  speechVoicesSchema,
} from '@kuhedu/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { HttpError } from '../../plugins/errors.ts'
import type { SoundCache } from './soundCache.ts'
import type { Speaker, SpeechCatalogue, Spoken } from './speaker.ts'

export type SpeechRoutesOptions = {
  speaker: Speaker
  cache: SoundCache
  /** Sounds one address may ask for in a minute. */
  requestsPerMinute: number
  logError: (error: unknown) => void
}

/** How long the list of voices is trusted before the speaking service is asked again. */
const CATALOGUE_FRESH_MS = 5 * 60_000
/** After it failed to answer, how long before it is asked again: not on every request. */
const CATALOGUE_RETRY_MS = 15_000

/**
 * `/api/speech/*`: the voices the app can speak with, and a text said in one of them. Open to
 * anyone, without an account being asked for: it says nothing about anyone, and the texts are
 * the lessons' own.
 */
export const speechRoutes: FastifyPluginAsyncZod<SpeechRoutesOptions> = async (app, options) => {
  const { speaker, cache, requestsPerMinute, logError } = options

  let known: SpeechCatalogue | null = null
  let askedAt = 0
  /**
   * The voices, as last heard from the speaking service. Kept when it stops answering, so that
   * sounds already made go on being served; `null` only if it has never answered.
   */
  const catalogue = async (): Promise<SpeechCatalogue | null> => {
    const age = Date.now() - askedAt
    if (known ? age < CATALOGUE_FRESH_MS : askedAt !== 0 && age < CATALOGUE_RETRY_MS) return known
    askedAt = Date.now()
    try {
      known = await speaker.catalogue()
    } catch (error) {
      logError(error)
    }
    return known
  }

  // The same sentence asked for twice at once (two learners opening one lesson) is made once.
  const beingMade = new Map<string, Promise<Spoken>>()

  app.get('/voices', { schema: { response: { 200: speechVoicesSchema } } }, async () => ({
    voices: (await catalogue())?.voices ?? [],
  }))

  app.get(
    '/audio',
    {
      config: { rateLimit: { max: requestsPerMinute, timeWindow: '1 minute' } },
      schema: { querystring: speechAudioQuerySchema },
    },
    async (request, reply) => {
      const { voice, text } = request.query
      const voices = await catalogue()
      if (!voices) throw new HttpError(503, 'unavailable', 'The speaking service is not answering')
      if (!voices.voices.some((offered) => offered.id === voice)) {
        throw new HttpError(404, 'not_found', 'No such voice')
      }

      const key = { model: voices.model, voice, text }
      let spoken: Spoken | null = await cache.read(key)
      if (!spoken) {
        const id = `${voice}\n${text}`
        let making = beingMade.get(id)
        if (!making) {
          making = speaker.speak(text, voice).finally(() => beingMade.delete(id))
          beingMade.set(id, making)
        }
        try {
          spoken = await making
        } catch (error) {
          logError(error)
          throw new HttpError(503, 'unavailable', 'The speaking service is not answering')
        }
        // Kept for next time; a disk that is full must not cost this learner the sound.
        await cache.write(key, spoken).catch(logError)
      }

      void reply.header('Content-Type', 'audio/mpeg')
      if (spoken.mouth) {
        return (
          reply
            // The mouth for a drawn face travels with its sound, so whatever keeps one keeps both.
            .header(SPEECH_MOUTH_HEADER, spoken.mouth)
            // The same voice and text are the same sound for good: the address is the sound's name.
            .header('Cache-Control', 'public, max-age=31536000, immutable')
            .send(spoken.sound)
        )
      }
      // Without its mouth a sound is not finished (see the cache): heard now, kept by nobody.
      return reply.header('Cache-Control', 'no-store').send(spoken.sound)
    },
  )
}
