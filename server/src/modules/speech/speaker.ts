import {
  SPEECH_MOUTH_HEADER,
  speechMouthTextSchema,
  speechVoiceSchema,
  type SpeechVoice,
} from '@kuhedu/contracts'
import { z } from 'zod'

/** The voices on offer, and the model that speaks them: a sound made by another is not reused. */
export type SpeechCatalogue = { model: string; voices: SpeechVoice[] }

/** A text said aloud: the sound as MP3, and the mouth for it as it is sent, where it is known. */
export type Spoken = { sound: Buffer; mouth: string | null }

/** Whatever turns a text into sound. The real one is the Python service beside this server. */
export type Speaker = {
  catalogue: () => Promise<SpeechCatalogue>
  /** The text said in the voice. */
  speak: (text: string, voiceId: string) => Promise<Spoken>
}

const catalogueSchema = z.object({
  model: z.string().regex(/^[a-z0-9.-]{1,60}$/),
  voices: z.array(speechVoiceSchema),
})

/**
 * A sentence takes about as long to make as it lasts, on a plain processor, and waits its turn
 * behind others. Anything slower than this is not going to answer.
 */
const SPEAK_TIMEOUT_MS = 90_000
const CATALOGUE_TIMEOUT_MS = 5_000

/** The speaking service (`speech/tts`), reached over HTTP on this machine. */
export function createSpeaker(url: string): Speaker {
  const at = (path: string) => new URL(path, url)

  return {
    async catalogue() {
      const response = await fetch(at('/voices'), {
        signal: AbortSignal.timeout(CATALOGUE_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`The speaking service answered ${response.status}`)
      return catalogueSchema.parse(await response.json())
    },

    async speak(text, voiceId) {
      const response = await fetch(at('/speak'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: voiceId }),
        signal: AbortSignal.timeout(SPEAK_TIMEOUT_MS),
      })
      if (!response.ok) throw new Error(`The speaking service answered ${response.status}`)
      // A mouth that does not read as one is left out: the sound is still the sound.
      const mouth = speechMouthTextSchema.safeParse(response.headers.get(SPEECH_MOUTH_HEADER))
      return {
        sound: Buffer.from(await response.arrayBuffer()),
        mouth: mouth.success ? mouth.data : null,
      }
    },
  }
}
