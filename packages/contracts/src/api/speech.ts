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

/**
 * With a sound comes the mouth for it, in this header: which shape a drawn face's lips have,
 * and from when. The speaking service knows exactly, because it decides how long every sound of
 * the sentence lasts before it makes the speech. A sound may come without it.
 */
export const SPEECH_MOUTH_HEADER = 'x-speech-mouth'

/** The shapes of speech, by the letter each is sent as. A face's mouth at rest is not one. */
export const SPEECH_MOUTH_SHAPES = {
  c: 'closed',
  m: 'mid',
  o: 'open',
  w: 'wide',
  r: 'round',
} as const

export type SpeechMouthShape = (typeof SPEECH_MOUTH_SHAPES)[keyof typeof SPEECH_MOUTH_SHAPES]

/** The lips take `shape` from `at` seconds into the sound, until the next mark. */
export type SpeechMouthMark = { at: number; shape: SpeechMouthShape }

/**
 * The header as it is sent: thousandths of a second and a shape's letter, over and over
 * (`0c75m150o`). A sentence at the longest text allowed is well inside the limit.
 */
export const speechMouthTextSchema = z
  .string()
  .max(8000)
  .regex(/^(?:\d{1,6}[cmowr])+$/)

/** The header read into marks, in the order they are reached. */
export const speechMouthSchema = speechMouthTextSchema.transform((text): SpeechMouthMark[] =>
  [...text.matchAll(/(\d+)([cmowr])/g)].map(([, at, letter]) => ({
    at: Number(at) / 1000,
    shape: SPEECH_MOUTH_SHAPES[letter as keyof typeof SPEECH_MOUTH_SHAPES],
  })),
)
