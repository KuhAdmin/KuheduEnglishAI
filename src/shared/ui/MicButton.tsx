import { Mic, Square } from 'lucide-react'
import { useRef, type MouseEvent, type PointerEvent } from 'react'
import { BigRoundButton } from './BigRoundButton'

/** Holding the button at least this long makes it "hold to talk": letting go stops it. */
export const HOLD_TO_TALK_MS = 500

export type MicButtonProps = {
  /** Recording, or about to (the microphone is opening). */
  active: boolean
  /** Sound is being captured right now. */
  recording: boolean
  onStart: () => void
  onStop: () => void
  /** Accessible name while idle, e.g. "Tap to speak". */
  startLabel: string
  /** Accessible name while recording, e.g. "Stop recording". */
  stopLabel: string
}

/**
 * Starts and stops a recording, two ways: tap to start and tap again to stop, or press and
 * hold to talk and let go to stop.
 * TODO(conversation): live waveform and slide-to-cancel, when the tutor conversation needs them.
 */
export function MicButton({
  active,
  recording,
  onStart,
  onStop,
  startLabel,
  stopLabel,
}: MicButtonProps) {
  const pressedAt = useRef<number | null>(null)

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (active) {
      pressedAt.current = null
      onStop()
      return
    }
    pressedAt.current = event.timeStamp
    onStart()
  }

  // Also runs on `pointercancel`, so a held press the system takes away still ends the recording.
  const handleRelease = (event: PointerEvent<HTMLButtonElement>) => {
    const began = pressedAt.current
    pressedAt.current = null
    if (began !== null && event.timeStamp - began >= HOLD_TO_TALK_MS) onStop()
  }

  // Keyboards and screen readers send a click with no pointer events before it.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0) return
    if (active) onStop()
    else onStart()
  }

  return (
    <BigRoundButton
      aria-label={active ? stopLabel : startLabel}
      aria-pressed={active}
      pulsing={recording}
      onPointerDown={handlePointerDown}
      onPointerUp={handleRelease}
      onPointerCancel={handleRelease}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
      // A held press must not turn into a scroll, which would cancel it.
      className="touch-none"
    >
      {active ? (
        <Square aria-hidden="true" className="size-8" fill="currentColor" />
      ) : (
        <Mic aria-hidden="true" className="size-9" />
      )}
    </BigRoundButton>
  )
}
