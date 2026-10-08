import { useCallback, useState } from 'react'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import type { DialogueLine } from '@/shared/lib/curriculum/weekDialogues'

/** Slower, but still natural speech. */
export const SLOW_RATE = 0.75

// One device voice plays everyone, so each speaker gets a pitch of their own.
const SPEAKER_PITCHES = [1.1, 0.85, 1.3, 0.7]

/** What the device is to say for each line, with one pitch per speaker. */
function toParts(lines: readonly DialogueLine[]) {
  const speakers = [...new Set(lines.map((line) => line.speaker))]
  return lines.map((line) => ({
    text: line.text,
    pitch: SPEAKER_PITCHES[speakers.indexOf(line.speaker) % SPEAKER_PITCHES.length],
  }))
}

/**
 * Reads a conversation aloud with the device's voice: all of it, or one line again. Knows
 * which line is being said, and how many have been said in the current run.
 */
export function useConversationPlayback(lines: readonly DialogueLine[]) {
  const { status, playAll, stop } = useSpeechPlayback()
  const [currentLine, setCurrentLine] = useState<number | null>(null)
  // Lines said in the run of the whole conversation; one line heard again does not change it.
  const [linesPlayed, setLinesPlayed] = useState(0)

  /** Resolves `true` when the whole conversation was heard to the end. */
  const playConversation = useCallback(
    async (rate = 1): Promise<boolean> => {
      setLinesPlayed(0)
      const outcome = await playAll(toParts(lines), {
        rate,
        onPartStart: (index) => {
          setCurrentLine(index)
          setLinesPlayed(index)
        },
      })
      if (outcome === 'ended') setLinesPlayed(lines.length)
      if (outcome !== 'cancelled') setCurrentLine(null)
      return outcome === 'ended'
    },
    [lines, playAll],
  )

  const playLine = useCallback(
    async (index: number) => {
      const part = toParts(lines)[index]
      if (!part) return
      setCurrentLine(index)
      const outcome = await playAll([part])
      // Cut short by another request: that one now owns the current line.
      if (outcome !== 'cancelled') setCurrentLine(null)
    },
    [lines, playAll],
  )

  const stopPlayback = useCallback(() => {
    stop()
    setCurrentLine(null)
  }, [stop])

  return {
    status,
    currentLine: status === 'playing' ? currentLine : null,
    linesPlayed,
    playConversation,
    playLine,
    stop: stopPlayback,
  }
}
