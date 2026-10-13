import {
  PRONUNCIATION_SAMPLE_RATE,
  PRONUNCIATION_SECONDS_MAX,
  type PronunciationFinding,
} from '@kuhedu/contracts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '@/shared/lib/api/client'
import type { Take } from '@/shared/lib/audio/useVoiceRecording'
import { canMakeWav, recordingToWav } from '@/shared/lib/audio/wav'
import { checkPronunciation, type WordSaid } from '../api/pronunciation'

/** Why a recording was not checked, as the screen says it. */
export type CheckProblem = 'unavailable' | 'unreadable' | 'tooMany'

export type PronunciationCheck =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'done'; findings: PronunciationFinding[] }
  | { status: 'failed'; problem: CheckProblem }

/** A refusal by the server; anything else (no connection, no server) is "not right now". */
export const problemOf = (error: unknown): CheckProblem => {
  if (!(error instanceof ApiError)) return 'unavailable'
  if (error.code === 'rate_limited') return 'tooMany'
  return error.code === 'validation_failed' ? 'unreadable' : 'unavailable'
}

type Checked = { take: Take; check: PronunciationCheck }

/**
 * Having the server check one recording of a word, when the learner asks. What it comes to
 * belongs to that recording: a new take, or none, starts again from nothing.
 */
export function usePronunciationCheck(take: Take | null, said: WordSaid) {
  const [checked, setChecked] = useState<Checked | null>(null)
  // The take now on the screen; an answer for an earlier one is not shown.
  const current = useRef<Take | null>(null)
  useEffect(() => {
    current.current = take
  })

  const start = useCallback(async () => {
    if (!take) return
    const settle = (check: PronunciationCheck) => {
      if (current.current === take) setChecked({ take, check })
    }
    setChecked({ take, check: { status: 'checking' } })

    let wav: Blob
    try {
      // The take is kept by its address in this page's memory; these are its bytes.
      const recording = await (await fetch(take.url)).blob()
      wav = await recordingToWav(recording, PRONUNCIATION_SAMPLE_RATE, PRONUNCIATION_SECONDS_MAX)
    } catch {
      // The browser cannot read back what it recorded: there is nothing to send.
      settle({ status: 'failed', problem: 'unreadable' })
      return
    }
    try {
      const { findings } = await checkPronunciation(wav, said)
      settle({ status: 'done', findings })
    } catch (error) {
      settle({ status: 'failed', problem: problemOf(error) })
    }
  }, [take, said])

  const check: PronunciationCheck = checked?.take === take ? checked.check : { status: 'idle' }

  return {
    /** Whether this browser can send a recording at all. */
    supported: canMakeWav(),
    check,
    start,
  }
}
