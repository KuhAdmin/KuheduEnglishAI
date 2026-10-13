import { pronunciationAssessmentSchema, type PronunciationAssessment } from '@kuhedu/contracts'
import { apiRequest } from '@/shared/lib/api/client'

/** What was to be said, as a lesson has it. */
export type WordSaid = {
  word: string
  /** The word in the parts it is said in: "We(d)n(e)s", "day". Empty when they are not written. */
  syllables: readonly string[]
  /** Which part is the strong one, counted from 1. */
  stress: number | null
}

/**
 * Have the server check a recording of a word, sent as a WAV. It is not kept there; what comes
 * back are findings as codes, to be said from the screen's own texts.
 */
export function checkPronunciation(
  wav: Blob,
  { word, syllables, stress }: WordSaid,
): Promise<PronunciationAssessment> {
  const said = new URLSearchParams({ word })
  // As the lesson's editor writes them, which is how the scorer counts them.
  if (syllables.length > 0) said.set('parts', syllables.join('-'))
  if (stress !== null) said.set('stress', String(stress))

  return apiRequest(`/pronunciation/assessments?${said}`, {
    method: 'POST',
    schema: pronunciationAssessmentSchema,
    blob: wav,
  })
}
