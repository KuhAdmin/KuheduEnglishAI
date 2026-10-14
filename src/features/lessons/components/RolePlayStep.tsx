import { Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useWakeLock } from '@/shared/hooks/useWakeLock'
import { MicrophoneHelp } from '@/shared/lib/audio/MicrophoneHelp'
import { roleplayPlayedBy, type WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { fillText, useT } from '@/shared/lib/i18n'
import { useTutorVoiceKind } from '@/shared/lib/learner/tutorAvatar'
import { Button } from '@/shared/ui/Button'
import { FitText } from '@/shared/ui/FitText'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useRolePlay, type RolePlayHelp } from '../hooks/useRolePlay'
import { clock } from '../lib/clock'
import { revealOnMount } from '../lib/revealOnMount'
import { EndChatConfirm } from './EndChatConfirm'
import { LessonNextButton } from './LessonNextButton'
import { PartnerBand } from './PartnerBand'
import { TalkControls } from './TalkControls'
import { TalkFinish } from './TalkFinish'
import { TalkIntroNotes } from './TalkIntroNotes'
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
 * scenarios of Day 7's challenge): the learner talks with a partner whose lines are written (the
 * partner does not listen or answer, so the screen does not claim an AI one). Every reply the
 * learner gave aloud stays with its turn, to be heard again and, when they ask, checked by the
 * server (`ReplyCheck`); nothing of the conversation depends on it.
 *
 * **The partner's face is in the band at the top until the conversation starts, and from then on
 * beside each of their lines** (`PartnerBand`, `TalkTranscript`): the band shrinks to the way
 * back and the day's place in the week, and the conversation has the room. It starts on a tap,
 * so the device may speak and the microphone has been explained. Once the browser allows the
 * microphone it opens by itself on each of the learner's turns, counting down the time to begin
 * and the end of a long turn.
 *
 * After the last turn the conversation closes with the tutor's praise (`TalkFinish`) and "Next"
 * is the one pinned action; leaving before that asks first and does not finish the day.
 * Speaking is never required: every turn can be skipped.
 */
export function RolePlayStep({
  roleplay: written,
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
  // The learner's tutor plays the partner, so the partner is called what fits that tutor.
  const tutor = useTutorVoiceKind()
  const roleplay = useMemo(() => roleplayPlayedBy(written, tutor), [written, tutor])
  const talk = useRolePlay(roleplay, help)
  const { recording, stage } = talk
  const [confirmingEnd, setConfirmingEnd] = useState(false)

  // Listening and speaking leave the screen untouched for a while; it must not go dark.
  useWakeLock(stage === 'talking')

  const { countdown } = talk
  const status =
    recording.phase === 'starting'
      ? t('lessonDay.practice.checking')
      : recording.phase === 'recording'
        ? t(
            countdown?.kind === 'start'
              ? 'lessonDay.talk.startSpeaking'
              : countdown?.kind === 'limit'
                ? 'lessonDay.talk.timeAlmostUp'
                : 'lessonDay.practice.recording',
          )
        : talk.speakingTurn !== null
          ? fillText(t('lessonDay.talk.speaking'), { name: roleplay.partner })
          : t('lessonDay.talk.yourTurn')

  const hasAnswers = Object.keys(talk.takes).length > 0
  // Some reply can still be sent to be checked: what that does is said by the way out.
  const canStillCheck =
    talk.canCheckReply &&
    Object.keys(talk.takes).some((turn) => talk.replyChecks[Number(turn)]?.status !== 'done')

  const footer = confirmingEnd ? (
    <EndChatConfirm
      backTo={backTo}
      note={endNote}
      onStay={() => {
        talk.resume()
        setConfirmingEnd(false)
      }}
    />
  ) : stage === 'intro' ? (
    <div className="flex flex-col gap-2">
      <TalkIntroNotes canCheckReply={talk.canCheckReply} />
      <Button size="lg" fullWidth onClick={talk.begin}>
        <Play aria-hidden="true" className="size-5" />
        {t('lessonDay.talk.start')}
      </Button>
    </div>
  ) : stage === 'talking' ? (
    <TalkControls
      status={status}
      countdown={countdown && { seconds: countdown.seconds, ending: countdown.kind === 'limit' }}
      elapsed={recording.phase === 'recording' ? clock(recording.elapsedMs) : undefined}
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
    <div className="flex flex-col gap-2">
      {canStillCheck && (
        // The check buttons carry no note of their own: said once here, on one line.
        <FitText className="text-center text-sm text-fg-muted">
          {t('lessonDay.reply.sends')}
        </FitText>
      )}
      <LessonNextButton lockedBecause={null} onNext={onNext} />
    </div>
  )

  return (
    <StepScreen
      eyebrow={eyebrow}
      title={fillText(t('lessonDay.talk.title'), { name: roleplay.partner })}
      subtitle={t('lessonDay.talk.subtitle')}
      topBarTone="soft"
      topBar={
        <PartnerBand
          backTo={backTo}
          backLabel={backLabel}
          day={day}
          dayCount={dayCount}
          imageUrl={roleplay.imageUrl}
          talking={stage !== 'intro'}
        />
      }
      footer={footer}
    >
      <div className="flex flex-1 animate-rise-in flex-col items-center gap-4">
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
              partnerImageUrl={roleplay.imageUrl}
              turns={roleplay.turns}
              opened={talk.opened}
              answered={talk.answered}
              spoken={talk.spoken}
              takes={talk.takes}
              playingTake={talk.playingTake}
              hint={talk.hint}
              speakingTurn={talk.speakingTurn}
              onReplay={talk.canSpeak ? talk.replayPartner : undefined}
              onSayReply={talk.canSpeak ? talk.sayReply : undefined}
              onListenToSelf={talk.listenToSelf}
              replyChecks={talk.replyChecks}
              onCheckReply={talk.canCheckReply ? talk.checkReply : undefined}
            />
          </div>
        )}

        {stage === 'done' && <TalkFinish hasAnswers={hasAnswers} onAgain={talk.begin} />}

        {recording.problem && (
          <div ref={revealOnMount} className="w-full">
            <MicrophoneHelp problem={recording.problem} />
          </div>
        )}
      </div>
    </StepScreen>
  )
}
