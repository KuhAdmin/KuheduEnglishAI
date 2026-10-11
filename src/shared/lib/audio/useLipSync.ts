import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/shared/hooks/useMediaQuery'
import { mouthShapesFor, type MouthShape } from './lipSync'
import { onSpeechActivity } from './speech'

/** How long a mouth shape is held at normal speed: about the length of a spoken sound. */
const FRAME_MS = 85
/** What the mouth does when a text is still being said after its own shapes have run out. */
const STILL_TALKING: MouthShape[] = ['mid', 'open', 'mid', 'closed']

/**
 * The shape of a mouth that moves with the app's voice, whatever on the screen asked it to
 * speak; `rest` while it is silent.
 *
 * A sound says when it starts and when it ends, not where in the text it is. So the mouth runs
 * through the whole text at a likely pace from the moment the sound starts, with the shapes read
 * off the spelling (`mouthShapesFor`): it looks like speech without being exact. With reduced
 * motion the mouth opens while the voice speaks and does not move.
 */
export function useLipSync(): MouthShape {
  const [mouth, setMouth] = useState<MouthShape>('rest')
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    let queue: MouthShape[] = []
    let timer: ReturnType<typeof setInterval> | undefined
    let speaking = false

    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const step = () => {
      const next = queue.shift()
      if (next) {
        setMouth(next)
      } else if (speaking) {
        // The voice is slower than the guess: keep talking until it says it has ended.
        queue = [...STILL_TALKING]
      } else {
        setMouth('rest')
        stop()
      }
    }
    const run = (shapes: MouthShape[], rate: number) => {
      stop()
      queue = shapes
      step()
      timer = setInterval(step, FRAME_MS / Math.max(rate, 0.1))
    }

    const stopListening = onSpeechActivity((activity) => {
      if (activity.type === 'end') {
        speaking = false
        queue = []
        stop()
        setMouth('rest')
      } else if (reducedMotion) {
        setMouth('mid')
      } else {
        speaking = true
        run(mouthShapesFor(activity.text), activity.rate)
      }
    })

    return () => {
      stopListening()
      stop()
    }
  }, [reducedMotion])

  return mouth
}
