import { useCallback, useEffect, useRef, useState } from 'react'
import { MicrophoneError, type MicrophoneProblem } from '@/shared/lib/audio/microphone'
import { startRecording, type ActiveRecording } from '@/shared/lib/audio/recorder'

export type RecordingPhase = 'idle' | 'starting' | 'recording' | 'recorded'

/** A finished recording the learner can play back. */
export type Take = { url: string; durationMs: number }

const TICK_MS = 200

/**
 * One spoken answer: record, play back, record again. The recording lives in memory only — it
 * is never stored or sent anywhere — and is dropped when a new one is made or the screen goes.
 * The microphone is released when recording ends, when the page is hidden, and on unmount.
 * TODO(backend): hand the recording to the server for scoring before dropping it.
 */
export function useVoiceRecording() {
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [take, setTake] = useState<Take | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [problem, setProblem] = useState<MicrophoneProblem | null>(null)
  const [playing, setPlaying] = useState(false)

  const active = useRef<ActiveRecording | null>(null)
  const busy = useRef(false)
  /** The learner let go before the microphone had opened. */
  const stopWhenReady = useRef(false)
  const mounted = useRef(true)
  const url = useRef<string | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)

  const dropTake = useCallback(() => {
    player.current?.pause()
    player.current = null
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }, [])

  const start = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    stopWhenReady.current = false
    dropTake()
    setTake(null)
    setPlaying(false)
    setProblem(null)
    setElapsedMs(0)
    setPhase('starting')

    try {
      const recording = await startRecording()
      active.current = recording
      if (stopWhenReady.current || !mounted.current) recording.stop()
      else setPhase('recording')

      const began = performance.now()
      const ticker = setInterval(() => setElapsedMs(performance.now() - began), TICK_MS)
      const result = await recording.finished
      clearInterval(ticker)
      active.current = null
      if (!mounted.current) return

      url.current = URL.createObjectURL(result.blob)
      setTake({ url: url.current, durationMs: result.durationMs })
      setAttempts((count) => count + 1)
      setPhase('recorded')
    } catch (error) {
      active.current = null
      if (!mounted.current) return
      setProblem(error instanceof MicrophoneError ? error.problem : 'unavailable')
      setPhase('idle')
    } finally {
      busy.current = false
    }
  }, [dropTake])

  const stop = useCallback(() => {
    if (active.current) active.current.stop()
    else stopWhenReady.current = true
  }, [])

  const playTake = useCallback(() => {
    if (!url.current) return
    player.current?.pause()
    const audio = new Audio(url.current)
    player.current = audio
    const finish = () => setPlaying(false)
    audio.onended = finish
    audio.onerror = finish
    setPlaying(true)
    audio.play().catch(finish)
  }, [])

  useEffect(() => {
    mounted.current = true
    const handleVisibility = () => {
      if (document.hidden) stop()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', handleVisibility)
      stop()
      dropTake()
    }
  }, [stop, dropTake])

  return { phase, elapsedMs, take, attempts, problem, playing, start, stop, playTake }
}
