import { useCallback, useState } from 'react'
import type { SpeechPart } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { speakerVoice, type WeekDialogue } from '@/shared/lib/curriculum/weekDialogues'

/** Slower, but still natural speech. */
export const SLOW_RATE = 0.75

/**
 * What is to be said for each line, and by whom. A speaker the conversation says is a woman or a
 * man is said in a voice of that kind. The speakers are also numbered in the order they first
 * speak, and one the conversation says nothing about has the voice of their number (the first
 * the learner's tutor's, the second the other tutor's).
 */
function toParts(dialogue: WeekDialogue): SpeechPart[] {
  const speakers = [...new Set(dialogue.lines.map((line) => line.speaker))]
  return dialogue.lines.map((line) => {
    const voice = speakerVoice(dialogue, line.speaker)
    return { text: line.text, speaker: speakers.indexOf(line.speaker), ...(voice && { voice }) }
  })
}

/**
 * Reads a conversation aloud, each speaker in a voice of their own: all of it, or one line
 * again. Knows
 * which line is being said, and how many have been said in the current run.
 */
export function useConversationPlayback(dialogue: WeekDialogue) {
  const { status, playAll, stop } = useSpeechPlayback()
  const [currentLine, setCurrentLine] = useState<number | null>(null)
  // Lines said in the run of the whole conversation; one line heard again does not change it.
  const [linesPlayed, setLinesPlayed] = useState(0)

  /** Resolves `true` when the whole conversation was heard to the end. */
  const playConversation = useCallback(
    async (rate = 1): Promise<boolean> => {
      setLinesPlayed(0)
      const outcome = await playAll(toParts(dialogue), {
        rate,
        onPartStart: (index) => {
          setCurrentLine(index)
          setLinesPlayed(index)
        },
      })
      if (outcome === 'ended') setLinesPlayed(dialogue.lines.length)
      if (outcome !== 'cancelled') setCurrentLine(null)
      return outcome === 'ended'
    },
    [dialogue, playAll],
  )

  const playLine = useCallback(
    async (index: number) => {
      const part = toParts(dialogue)[index]
      if (!part) return
      setCurrentLine(index)
      const outcome = await playAll([part])
      // Cut short by another request: that one now owns the current line.
      if (outcome !== 'cancelled') setCurrentLine(null)
    },
    [dialogue, playAll],
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
