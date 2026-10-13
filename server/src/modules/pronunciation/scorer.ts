import { PRONUNCIATION_CODES, type PronunciationQuery } from '@kuhedu/contracts'
import { z } from 'zod'

/** One thing the scorer found, as it says it: with how sure it is, whether or not that is enough. */
export type ScorerFinding = z.infer<typeof findingSchema>

/** Whatever judges a recording of a word. The real one is the Python service beside this server. */
export type Scorer = {
  /** The findings for a recording (a WAV) of what was to be said. */
  assess: (recording: Buffer, said: PronunciationQuery) => Promise<ScorerFinding[]>
}

/** The scorer refused the recording itself: it is not one, or not as the app is to send it. */
export class UnreadableRecording extends Error {}

const findingSchema = z.object({
  code: z.enum(PRONUNCIATION_CODES),
  confidence: z.number().min(0).max(1),
  // Numbers for a count of parts or for which part is strong; the sounds themselves for a sound
  // that differs, which are not passed on (see the route).
  expected: z.union([z.number(), z.string()]).optional(),
  heard: z.union([z.number(), z.string()]).optional(),
  /** For a sound that differs: the word of what was to be said that it was in, where known. */
  word: z.string().optional(),
})

const reportSchema = z.object({ findings: z.array(findingSchema).min(1) })

/**
 * A word takes about half a second to judge and waits its turn behind others; the first after
 * a start is slower. Anything slower than this is not going to answer.
 */
const ASSESS_TIMEOUT_MS = 30_000

/** The scoring service (`speech/assess`), reached over HTTP on this machine. */
export function createScorer(url: string): Scorer {
  return {
    async assess(recording, { word, parts, stress }) {
      const at = new URL('/assess', url)
      at.searchParams.set('word', word)
      if (parts) at.searchParams.set('parts', parts)
      if (stress !== undefined) at.searchParams.set('stress', String(stress))

      const response = await fetch(at, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: new Uint8Array(recording),
        signal: AbortSignal.timeout(ASSESS_TIMEOUT_MS),
      })
      if (response.status === 413 || response.status === 422) {
        throw new UnreadableRecording(`The scoring service answered ${response.status}`)
      }
      if (!response.ok) throw new Error(`The scoring service answered ${response.status}`)
      return reportSchema.parse(await response.json()).findings
    },
  }
}
