import { useCallback, useEffect, useRef, useState } from 'react'
import { MicrophoneError, type MicrophoneProblem } from './microphone'
import { startRecording, type ActiveRecording } from './recorder'
import { listenForVoice, type VoiceReading } from './voiceActivity'

export type RecordingPhase = 'idle' | 'starting' | 'recording' | 'recorded'

/** A finished recording the learner can play back. */
export type Take = { url: string; durationMs: number }

/** What the microphone has picked up during the recording under way. */
export type VoiceActivity = {
  /** A voice has been heard at least once. */
  heard: boolean
  /** How long it has been quiet: since the voice was last heard, or since the start. */
  quietMs: number
}

/** Where a recording under way has got to; `voice` is `null` when the device cannot tell. */
export type RecordingProgress = { elapsedMs: number; voice: VoiceActivity | null }

export type VoiceRecordingOptions = {
  /** The longest a recording may run before it ends by itself; the recorder's own limit if left out. */
  maxDurationMs?: number
  /** Also listen for the learner's voice, where the device can (see `voiceActivity.ts`). */
  listen?: boolean
  /** Keep the earlier take until a new one replaces it, not only until the next one starts. */
  keepTake?: boolean
  /** Told several times a second while recording; the place for rules that end it. */
  onProgress?: (progress: RecordingProgress) => void
}

const TICK_MS = 200

/**
 * One spoken attempt: record, play back, record again. The recording lives in memory only — it
 * is never stored or sent anywhere — and is dropped when a new one is made or the screen goes.
 * The microphone is released when recording ends, when the page is hidden, and on unmount.
 * TODO(backend): hand the recording to the server for scoring before dropping it.
 */
export function useVoiceRecording(options: VoiceRecordingOptions = {}) {
  const [phase, setPhase] = useState<RecordingPhase>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [voice, setVoice] = useState<VoiceActivity | null>(null)
  const [take, setTake] = useState<Take | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [problem, setProblem] = useState<MicrophoneProblem | null>(null)
  const [playing, setPlaying] = useState(false)

  const active = useRef<ActiveRecording | null>(null)
  const busy = useRef(false)
  /** The learner let go before the microphone had opened. */
  const stopWhenReady = useRef(false)
  /** The recording has been asked to end; nothing more is to be made of its progress. */
  const ending = useRef(false)
  const mounted = useRef(true)
  /** Goes up on `reset` and `cancel`, so a recording made before them is not taken for a new one. */
  const generation = useRef(0)
  const url = useRef<string | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  // Read when a recording starts and on each tick, so the latest are always the ones in force.
  const settings = useRef(options)
  useEffect(() => {
    settings.current = options
  })

  const stopPlayer = useCallback(() => {
    player.current?.pause()
    player.current = null
    setPlaying(false)
  }, [])

  const dropTake = useCallback(() => {
    player.current?.pause()
    player.current = null
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = null
  }, [])

  const start = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    const run = generation.current
    const current = () => mounted.current && run === generation.current
    const { maxDurationMs, listen, keepTake } = settings.current
    stopWhenReady.current = false
    ending.current = false
    // Either way the earlier take must not play into the new one.
    if (keepTake) {
      stopPlayer()
    } else {
      dropTake()
      setTake(null)
      setPlaying(false)
    }
    setProblem(null)
    setElapsedMs(0)
    setVoice(null)
    setPhase('starting')

    try {
      const recording = await startRecording({ maxDurationMs })
      active.current = recording
      let reading: VoiceReading | null = null
      const stopListening = listen
        ? listenForVoice(recording.stream, (next) => (reading = next))
        : null
      if (stopWhenReady.current || !current()) {
        recording.stop()
      } else {
        setVoice(stopListening ? { heard: false, quietMs: 0 } : null)
        setPhase('recording')
      }

      const began = performance.now()
      const ticker = setInterval(() => {
        const now = performance.now()
        const progress: RecordingProgress = {
          elapsedMs: now - began,
          voice: stopListening
            ? { heard: reading?.heard ?? false, quietMs: now - (reading?.lastVoiceAt ?? began) }
            : null,
        }
        if (!current() || ending.current) return
        setElapsedMs(progress.elapsedMs)
        setVoice(progress.voice)
        settings.current.onProgress?.(progress)
      }, TICK_MS)
      const result = await recording.finished
      clearInterval(ticker)
      stopListening?.()
      active.current = null
      if (!current()) return

      dropTake()
      url.current = URL.createObjectURL(result.blob)
      setTake({ url: url.current, durationMs: result.durationMs })
      setPlaying(false)
      setAttempts((count) => count + 1)
      setPhase('recorded')
    } catch (error) {
      active.current = null
      if (!current()) return
      setProblem(error instanceof MicrophoneError ? error.problem : 'unavailable')
      setPhase(url.current ? 'recorded' : 'idle')
    } finally {
      busy.current = false
    }
  }, [dropTake, stopPlayer])

  const stop = useCallback(() => {
    ending.current = true
    if (active.current) active.current.stop()
    else stopWhenReady.current = true
  }, [])

  /** Forget the attempt (e.g. the learner moved on to another word); stops a recording under way. */
  const reset = useCallback(() => {
    generation.current += 1
    stop()
    dropTake()
    setTake(null)
    setPlaying(false)
    setProblem(null)
    setElapsedMs(0)
    setVoice(null)
    setPhase('idle')
  }, [stop, dropTake])

  /** Close the microphone and make nothing of what it picked up; an earlier take is kept. */
  const cancel = useCallback(() => {
    generation.current += 1
    stop()
    setElapsedMs(0)
    setVoice(null)
    setPhase(url.current ? 'recorded' : 'idle')
  }, [stop])

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

  return {
    phase,
    elapsedMs,
    voice,
    take,
    attempts,
    problem,
    playing,
    start,
    stop,
    reset,
    cancel,
    playTake,
  }
}
