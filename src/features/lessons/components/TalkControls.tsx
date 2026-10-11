import { Lightbulb, X } from 'lucide-react'
import type { RecordingPhase } from '@/shared/lib/audio/useVoiceRecording'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { MicButton } from '@/shared/ui/MicButton'
import { LabelledAction } from './LabelledAction'
import { TurnCountdown, type TurnCountdownProps } from './TurnCountdown'

export type TalkControlsProps = {
  /** What is happening now: who speaks, or that it is the learner's turn. */
  status: string
  /** Seconds running out while the microphone is open: to begin speaking, or to the turn's end. */
  countdown?: TurnCountdownProps | null
  /** How long the recording has run, e.g. "0:07"; shown when nothing is being counted down. */
  elapsed?: string
  phase: RecordingPhase
  /** "Hint", or what a second tap gives. */
  hintLabel: string
  /** There is no more help to give on this turn. */
  hintDisabled: boolean
  /** Left out when the conversation is taken without help: there is then no hint to ask for. */
  onHint?: () => void
  onStart: () => void
  onStop: () => void
  /** Go on without speaking: the microphone is never a condition. */
  onSkip: () => void
  onEnd: () => void
}

/** The learner's side of a conversation: the microphone, with help and the ways out around it. */
export function TalkControls({
  status,
  countdown,
  elapsed,
  phase,
  hintLabel,
  hintDisabled,
  onHint,
  onStart,
  onStop,
  onSkip,
  onEnd,
}: TalkControlsProps) {
  const t = useT()

  return (
    <div className="flex flex-col items-center gap-1">
      {/* As tall as the countdown at all times, so the controls under it never move. */}
      <p className="flex min-h-8 items-center justify-center gap-2 text-center text-sm font-bold text-fg-muted">
        <span role="status">{status}</span>
        {/* Time that ticks is kept out of the announced line, which would be read every second. */}
        {countdown ? (
          <TurnCountdown {...countdown} />
        ) : (
          elapsed && (
            <span aria-hidden="true" className="tabular-nums">
              {elapsed}
            </span>
          )
        )}
      </p>
      <div className="flex w-full items-center justify-between">
        {onHint ? (
          <LabelledAction
            icon={<Lightbulb aria-hidden="true" className="size-5" />}
            label={hintLabel}
            disabled={hintDisabled}
            onClick={onHint}
          />
        ) : (
          // Keeps the microphone in the middle, where the thumb expects it.
          <span aria-hidden="true" className="w-20" />
        )}
        <MicButton
          active={phase === 'starting' || phase === 'recording'}
          recording={phase === 'recording'}
          onStart={onStart}
          onStop={onStop}
          startLabel={t('lessonDay.practice.start')}
          stopLabel={t('lessonDay.practice.stop')}
        />
        <LabelledAction
          icon={<X aria-hidden="true" className="size-5" />}
          label={t('lessonDay.talk.end')}
          onClick={onEnd}
        />
      </div>
      <Button variant="ghost" onClick={onSkip}>
        {t('lessonDay.talk.skip')}
      </Button>
    </div>
  )
}
