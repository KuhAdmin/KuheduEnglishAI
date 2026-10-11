import { z } from 'zod'

/**
 * What the app says aloud comes from the server as sound: a text said in one of the server's
 * voices. The device's own voices are not used.
 */

/** A sentence or two: what a lesson or the tutor says in one go. */
export const SPEECH_TEXT_MAX = 400

/** The two kinds of voice, which are also the two kinds of tutor. */
export const SPEECH_GENDERS = ['female', 'male'] as const

export type SpeechGender = (typeof SPEECH_GENDERS)[number]

/** A voice's id says what it is: language, gender, then its name (`af_heart`). */
export const speechVoiceIdSchema = z.string().regex(/^[a-z]{2}_[a-z0-9]{1,30}$/)

export const speechVoiceSchema = z.object({
  id: speechVoiceIdSchema,
  /** What the voice is called on screen. Its own name, not a text of ours: never translated. */
  name: z.string().min(1).max(40),
  /** A language tag with its region (`en-GB`, `hi-IN`): the accent is part of the choice. */
  language: z.string().regex(/^[a-z]{2,3}-[A-Z]{2}$/),
  gender: z.enum(SPEECH_GENDERS),
  /** The voice a tutor of this gender has in this language until the learner chooses one. */
  default: z.boolean(),
})

export type SpeechVoice = z.infer<typeof speechVoiceSchema>

/** `GET /api/speech/voices`. Empty while the server cannot speak; the app is then silent. */
export const speechVoicesSchema = z.object({ voices: z.array(speechVoiceSchema) })

export type SpeechVoices = z.infer<typeof speechVoicesSchema>

/** `GET /api/speech/audio`: answered with the sound itself (`audio/mpeg`), not with JSON. */
export const speechAudioQuerySchema = z.object({
  voice: speechVoiceIdSchema,
  text: z.string().trim().min(1).max(SPEECH_TEXT_MAX),
})

export type SpeechAudioQuery = z.infer<typeof speechAudioQuerySchema>
