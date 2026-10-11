import { useCallback, useState } from 'react'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import type { DialogueLine } from '@/shared/lib/curriculum/weekDialogues'

/** Slower, but still natural speech. */
export const SLOW_RATE = 0.75

/**
 * What is to be said for each line, and by whom: the speakers are numbered in the order they
 * first speak, and each number has a voice of its own (the first the learner's tutor's, the
 * second the other tutor's).
 */
function toParts(lines: readonly DialogueLine[]) {
  const speakers = [...new Set(lines.map((line) => line.speaker))]
  return lines.map((line) => ({ text: line.text, speaker: speakers.indexOf(line.speaker) }))
}

/**
 * Reads a conversation aloud, each speaker in a voice of their own: all of it, or one line
 * again. Knows
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
