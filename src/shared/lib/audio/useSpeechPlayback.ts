import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelSpeech,
  primeVoices,
  speak,
  speakAll,
  type SpeakAllOptions,
  type SpeechOutcome,
  type SpeechPart,
} from './speech'

export type PlaybackStatus = 'idle' | 'playing' | 'failed'

/**
 * Plays English text aloud with the device's voice. Playback stops when the screen is hidden
 * or the component goes away. `play` and `playAll` must be called from a tap.
 */
export function useSpeechPlayback() {
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  // Only the latest request may change the status; an older one was cut short by it.
  const latest = useRef(0)

  const run = useCallback(
    async (
      start: (isLatest: () => boolean) => Promise<SpeechOutcome>,
    ): Promise<SpeechOutcome | 'failed'> => {
      const request = ++latest.current
      const isLatest = () => request === latest.current
      setStatus('playing')
      try {
        const outcome = await start(isLatest)
        if (isLatest()) setStatus('idle')
        return outcome
      } catch {
        if (isLatest()) setStatus('failed')
        return 'failed'
      }
    },
    [],
  )

  const play = useCallback((text: string, rate = 1) => run(() => speak(text, { rate })), [run])

  /** Several texts in a row (e.g. the lines of a conversation). */
  const playAll = useCallback(
    (parts: readonly SpeechPart[], options: SpeakAllOptions = {}) =>
      run((isLatest) =>
        speakAll(parts, {
          ...options,
          onPartStart: (index) => {
            if (isLatest()) options.onPartStart?.(index)
          },
        }),
      ),
    [run],
  )

  const stop = useCallback(() => {
    latest.current += 1
    cancelSpeech()
    setStatus((current) => (current === 'playing' ? 'idle' : current))
  }, [])

  useEffect(() => {
    primeVoices()
    const handleVisibility = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      cancelSpeech()
    }
  }, [stop])

  return { status, play, playAll, stop }
}
