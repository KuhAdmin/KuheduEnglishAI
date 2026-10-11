import type { RecordingProgress } from '@/shared/lib/audio/useVoiceRecording'

/** How long an open microphone waits for the learner to begin. The intro's note says so too. */
export const START_WINDOW_MS = 5_000
/** A pause this long after speaking means the learner has finished. */
export const PAUSE_ENDS_TURN_MS = 3_000
/** The longest one turn may run. */
export const MAX_TURN_MS = 120_000
/** The end of a turn is counted down from this far out. */
export const LAST_CALL_MS = 20_000

/** Seconds left on show: to begin speaking, or to the end of the turn. */
export type TurnCountdown = { kind: 'start' | 'limit'; seconds: number }

export type TurnTiming = {
  /** `shut`: close the microphone, the turn stays open. `answer`: the turn is over. */
  action: 'none' | 'shut' | 'answer'
  countdown: TurnCountdown | null
}

/**
 * What a turn's open microphone calls for at this moment. Where the device cannot tell whether
 * the learner is speaking (`voice` is `null`) only the turn's length is watched, and the learner
 * ends the turn by tapping.
 */
export function turnTiming({ elapsedMs, voice }: RecordingProgress): TurnTiming {
  if (elapsedMs >= MAX_TURN_MS) {
    return { action: 'answer', countdown: { kind: 'limit', seconds: 0 } }
  }
  if (voice && !voice.heard) {
    if (elapsedMs >= START_WINDOW_MS) return { action: 'shut', countdown: null }
    const seconds = Math.ceil((START_WINDOW_MS - elapsedMs) / 1000)
    return { action: 'none', countdown: { kind: 'start', seconds } }
  }
  if (voice && voice.quietMs >= PAUSE_ENDS_TURN_MS) return { action: 'answer', countdown: null }

  const leftMs = MAX_TURN_MS - elapsedMs
  return {
    action: 'none',
    countdown: leftMs <= LAST_CALL_MS ? { kind: 'limit', seconds: Math.ceil(leftMs / 1000) } : null,
  }
}
