import { Play, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useWakeLock } from '@/shared/hooks/useWakeLock'
import { MicrophoneHelp } from '@/shared/lib/audio/MicrophoneHelp'
import { cn } from '@/shared/lib/cn'
import type { WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { fillText, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useRolePlay, type RolePlayHelp } from '../hooks/useRolePlay'
import { clock } from '../lib/clock'
import { revealOnMount } from '../lib/revealOnMount'
import { EndChatConfirm } from './EndChatConfirm'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'
import { PartnerAvatar } from './PartnerAvatar'
import { TalkControls } from './TalkControls'
import { TalkTranscript } from './TalkTranscript'

export type RolePlayStepProps = {
  roleplay: WeekRoleplay
  /** This day's place in the week, e.g. 4 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow and "End chat" lead: the week's overview. */
  backTo: string
  /** What the back arrow is called, when it does not lead to the week. */
  backLabel?: string
  /** What "End chat" warns of, when leaving does not lead to the week. */
  endNote?: string
  /** A short line above the heading, e.g. the scenario and the level being taken. */
  eyebrow?: string
  /** How much help each turn comes with; on Day 4, none until it is asked for. */
  help?: RolePlayHelp
  /** The conversation was taken to its end, and the learner goes on. */
  onNext: () => void
}

/**
 * Day 4, a role-play (and, with other ones, the mini role-play of Day 6's review and the
 * scenarios of Day 7's challenge): the learner talks with a partner whose lines are written (there is no AI
 * yet, so the screen does not claim one). It starts on a tap, so the device may speak and the
 * microphone has been explained. "Next" comes after the last turn; leaving before that asks
 * first and does not finish the day. Speaking is never required: every turn can be skipped.
 */
export function RolePlayStep({
  roleplay,
  day,
  dayCount,
  backTo,
  backLabel,
  endNote,
  eyebrow,
  help = 'asked',
  onNext,
}: RolePlayStepProps) {
  const t = useT()
  const talk = useRolePlay(roleplay, help)
  const { recording, stage } = talk
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  // Listening and speaking leave the screen untouched for a while; it must not go dark.
  useWakeLock(stage === 'talking')

  const status =
    recording.phase === 'starting'
      ? t('lessonDay.practice.checking')
      : recording.phase === 'recording'
        ? `${t('lessonDay.practice.recording')} ${clock(recording.elapsedMs)}`
        : talk.speakingTurn !== null
          ? fillText(t('lessonDay.talk.speaking'), { name: roleplay.partner })
          : t('lessonDay.talk.yourTurn')

  const footer = confirmingEnd ? (
    <EndChatConfirm backTo={backTo} note={endNote} onStay={() => setConfirmingEnd(false)} />
  ) : stage === 'intro' ? (
    <div className="flex flex-col gap-2">
      {/* Said before the browser asks, so the request for the microphone is no surprise. */}
      <p className="text-center text-sm text-fg-muted">{t('lessonDay.practice.micNote')}</p>
      <Button size="lg" fullWidth onClick={talk.begin}>
        <Play aria-hidden="true" className="size-5" />
        {t('lessonDay.talk.start')}
      </Button>
    </div>
  ) : stage === 'talking' ? (
    <TalkControls
      status={status}
      phase={recording.phase}
      hintLabel={t(talk.moreHelpLeft ? 'lessonDay.talk.hintMore' : 'lessonDay.talk.hint')}
      hintDisabled={talk.noHelpLeft}
      onHint={help === 'none' ? undefined : talk.askForHint}
      onStart={talk.startTurn}
      onStop={talk.endTurn}
      onSkip={talk.skipTurn}
      onEnd={() => {
        talk.pause()
        setConfirmingEnd(true)
      }}
    />
  ) : (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-center font-extrabold">
        {t('lessonDay.talk.done')}
      </p>
      <Button variant="secondary" size="lg" fullWidth onClick={talk.begin}>
        <RotateCcw aria-hidden="true" className="size-5" />
        {t('lessonDay.talk.again')}
      </Button>
      <LessonNextButton lockedBecause={null} onNext={onNext} />
    </div>
  )

  return (
    <StepScreen
      eyebrow={eyebrow}
      title={fillText(t('lessonDay.talk.title'), { name: roleplay.partner })}
      subtitle={t('lessonDay.talk.subtitle')}
      topBar={<LessonTopBar backTo={backTo} backLabel={backLabel} day={day} dayCount={dayCount} />}
      footer={footer}
    >
      <div
        className={cn(
          'flex flex-1 animate-rise-in flex-col items-center gap-4',
          stage === 'intro' && 'justify-center',
        )}
      >
        <PartnerAvatar imageUrl={roleplay.imageUrl} speaking={talk.speakingTurn !== null} />

        {stage !== 'intro' && talk.cannotSpeak && (
          <p
            role="alert"
            className="w-full rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.talk.audioFailed')}
          </p>
        )}

        {stage !== 'intro' && (
          <div className="w-full">
            <TalkTranscript
              partnerName={roleplay.partner}
              turns={roleplay.turns}
              opened={talk.opened}
              answered={talk.answered}
              hint={talk.hint}
              speakingTurn={talk.speakingTurn}
              takeTurn={talk.takeTurn}
              playingTake={recording.playing}
              onReplay={talk.canSpeak ? talk.replayPartner : undefined}
              onSayReply={talk.canSpeak ? talk.sayReply : undefined}
              onListenToSelf={recording.playTake}
            />
          </div>
        )}

        {recording.problem && (
          <div ref={revealOnMount} className="w-full">
            <MicrophoneHelp problem={recording.problem} />
          </div>
        )}
      </div>
    </StepScreen>
  )
}
