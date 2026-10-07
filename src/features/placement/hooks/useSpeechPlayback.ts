import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelSpeech, primeVoices, speak, type SpeechOutcome } from '@/shared/lib/audio/speech'

export type PlaybackStatus = 'idle' | 'playing' | 'failed'

/**
 * Plays English text aloud with the device's voice. Playback stops when the screen is hidden
 * or the component goes away. `play` must be called from a tap.
 */
export function useSpeechPlayback() {
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  // Only the latest request may change the status; an older one was cut short by it.
  const latest = useRef(0)

  const play = useCallback(async (text: string, rate = 1): Promise<SpeechOutcome | 'failed'> => {
    const request = ++latest.current
    setStatus('playing')
    try {
      const outcome = await speak(text, { rate })
      if (request === latest.current) setStatus('idle')
      return outcome
    } catch {
      if (request === latest.current) setStatus('failed')
      return 'failed'
    }
  }, [])

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

  return { status, play, stop }
}
