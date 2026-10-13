import { z } from 'zod'
import { UnreadableRecording } from '../pronunciation/scorer.ts'

/** Whatever writes down what was said in a recording. The real one is Whisper, in `speech/assess`. */
export type Listener = {
  /** The words said in a recording (a WAV), or `null` when it heard none it was sure of. */
  write: (recording: Buffer) => Promise<string | null>
}

const writtenSchema = z.object({ text: z.string(), confidence: z.number().min(0).max(1) })

/**
 * A reply takes a second or two to write down on a plain processor and waits its turn behind
 * others. Anything slower than this is not going to answer.
 */
const WRITE_TIMEOUT_MS = 45_000

/** The scoring service's ear for words (`speech/assess`, `/transcribe`), on this machine. */
export function createListener(url: string): Listener {
  return {
    async write(recording) {
      const response = await fetch(new URL('/transcribe', url), {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: new Uint8Array(recording),
        signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
      })
      if (response.status === 413 || response.status === 422) {
        throw new UnreadableRecording(`The scoring service answered ${response.status}`)
      }
      if (!response.ok) throw new Error(`The scoring service answered ${response.status}`)
      const { text } = writtenSchema.parse(await response.json())
      return text.trim() || null
    },
  }
}
