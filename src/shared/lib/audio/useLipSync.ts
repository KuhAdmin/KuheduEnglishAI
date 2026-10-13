import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery'
import { guessedMouth, mouthAt, type MouthMark, type MouthShape } from './lipSync'
import { onSpeechActivity, type PlayingSound } from './speech'

/**
 * The shape of a mouth that moves with the app's voice, whatever on the screen asked it to
 * speak; `rest` while it is silent.
 *
 * It follows the sound itself: many times a second it asks the player how far into the sound it
 * is, and takes the shape the server gave for that moment. So the lips keep time with what is
 * heard when it is played slowly, when it stalls, and through its pauses. A sound that came
 * without a mouth gets a likely one from its spelling (`guessedMouth`). With reduced motion the
 * mouth opens while the voice speaks and does not move.
 */
export function useLipSync(): MouthShape {
  const [mouth, setMouth] = useState<MouthShape>('rest')
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    let frame: number | undefined

    const stop = () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      frame = undefined
    }

    const follow = (text: string, sound: PlayingSound) => {
      stop()
      let guess: { seconds: number; marks: MouthMark[] } | undefined
      const marks = () => {
        if (sound.mouth) return sound.mouth
        // Guessed again once the player knows the sound's length, which it may not at first.
        const seconds = sound.duration()
        if (!guess || !Object.is(guess.seconds, seconds)) {
          guess = { seconds, marks: guessedMouth(text, seconds) }
        }
        return guess.marks
      }
      const look = () => {
        setMouth(mouthAt(marks(), sound.position()))
        frame = requestAnimationFrame(look)
      }
      look()
    }

    const stopListening = onSpeechActivity((activity) => {
      if (activity.type === 'end') {
        stop()
        setMouth('rest')
      } else if (reducedMotion) {
        setMouth('mid')
      } else {
        follow(activity.text, activity.sound)
      }
    })

    return () => {
      stopListening()
      stop()
    }
  }, [reducedMotion])

  return mouth
}
