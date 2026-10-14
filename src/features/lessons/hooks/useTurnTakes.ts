import { useCallback, useEffect, useRef, useState } from 'react'
import type { FinishedTake, Take } from '@/shared/lib/audio/useVoiceRecording'

/**
 * The learner's answers in one conversation, each kept with the turn it answered, so that any of
 * them can be heard again, or checked, after the conversation has gone on. Like every recording
 * here they live in this page's memory only: they go when the conversation is started again and
 * when the screen is left, and nothing stores or sends them (a check does, on the learner's tap).
 */
export function useTurnTakes() {
  const [takes, setTakes] = useState<Readonly<Record<number, Take>>>({})
  const [playing, setPlaying] = useState<number | null>(null)
  const urls = useRef<string[]>([])
  const player = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    player.current?.pause()
    player.current = null
    setPlaying(null)
  }, [])

  const keep = useCallback((turn: number, recording: FinishedTake) => {
    const url = URL.createObjectURL(recording.blob)
    urls.current.push(url)
    setTakes((all) => ({ ...all, [turn]: { url, durationMs: recording.durationMs } }))
  }, [])

  const forget = useCallback(() => {
    player.current?.pause()
    player.current = null
    for (const url of urls.current) URL.revokeObjectURL(url)
    urls.current = []
  }, [])

  const clear = useCallback(() => {
    forget()
    setTakes({})
    setPlaying(null)
  }, [forget])

  const play = (turn: number) => {
    const take = takes[turn]
    if (!take) return
    player.current?.pause()
    const audio = new Audio(take.url)
    player.current = audio
    // Only the take that is still the one playing may say that nothing is.
    const finish = () => {
      if (player.current !== audio) return
      player.current = null
      setPlaying(null)
    }
    audio.onended = finish
    audio.onerror = finish
    setPlaying(turn)
    audio.play().catch(finish)
  }

  useEffect(() => forget, [forget])

  return {
    /** The recordings kept, by the number of the turn each answered. */
    takes,
    /** The turn whose recording is being played back. */
    playing,
    keep,
    play,
    stop,
    clear,
  }
}
