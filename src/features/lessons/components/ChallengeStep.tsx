import { useEffect, useState } from 'react'
import { MicrophoneHelp } from '@/shared/lib/audio/MicrophoneHelp'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import {
  challengeText,
  MAX_CHALLENGE_TAKE_MS,
  type WeekChallenge,
} from '@/shared/lib/curriculum/weekChallenges'
import { useLanguage, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { ScenePicture } from '@/shared/ui/ScenePicture'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useSpokenPractice } from '../hooks/useSpokenPractice'
import { revealOnMount } from '../lib/revealOnMount'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'
import { PhraseHelp } from './PhraseHelp'
import { PronunciationPractice } from './PronunciationPractice'
import { TaskChecklist } from './TaskChecklist'

export type ChallengeStepProps = {
  challenge: WeekChallenge
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This day's place in the week, e.g. 5 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** What the back arrow is called, when it does not lead to the week. */
  backLabel?: string
  /** The learner finished this day before, so nothing is locked. */
  doneBefore: boolean
  onNext: () => void
}

/**
 * Day 5, the week's challenge (repeated as the speaking practice of Day 6's review): everything the list asks for, said in one recording, without
 * prompts on the screen. The learner then listens back and ticks what they managed — their own
 * judgement, because nothing can assess a recording yet, and the screen does not say otherwise.
 * "Next" opens after one attempt, or for a learner who cannot record: speaking is never forced.
 */
export function ChallengeStep({
  challenge,
  picture,
  day,
  dayCount,
  backTo,
  backLabel,
  doneBefore,
  onNext,
}: ChallengeStepProps) {
  const t = useT()
  const language = useLanguage()
  const playback = useSpeechPlayback()
  const { recording, startSpeaking, stopSpeaking } = useSpokenPractice(playback.stop)
  const [ticked, setTicked] = useState<ReadonlySet<number>>(new Set())
  const [helpOpen, setHelpOpen] = useState(false)
  const [cannotRecord, setCannotRecord] = useState(false)

  const title = challengeText(challenge.title, language)
  const instruction = challengeText(challenge.instruction, language)
  const micOpen = recording.phase === 'starting' || recording.phase === 'recording'
  // There is something to judge only while a recording exists.
  const hasTake = recording.phase === 'recorded'
  const canContinue =
    doneBefore || recording.attempts > 0 || cannotRecord || recording.problem !== null

  // The take is held in memory, so it has a length it may not pass.
  const { phase, elapsedMs, stop } = recording
  useEffect(() => {
    if (phase === 'recording' && elapsedMs >= MAX_CHALLENGE_TAKE_MS) stop()
  }, [phase, elapsedMs, stop])

  const handleStart = () => {
    // Another attempt is judged afresh.
    setTicked(new Set())
    startSpeaking()
  }

  const handleToggle = (index: number) =>
    setTicked((before) => {
      const next = new Set(before)
      if (!next.delete(index)) next.add(index)
      return next
    })

  return (
    <StepScreen
      title={title.text}
      subtitle={instruction.text || undefined}
      topBar={<LessonTopBar backTo={backTo} backLabel={backLabel} day={day} dayCount={dayCount} />}
      footer={
        <div className="flex flex-col gap-3">
          <PronunciationPractice
            title={t('lessonDay.perform.record')}
            phase={recording.phase}
            elapsedMs={recording.elapsedMs}
            limitMs={MAX_CHALLENGE_TAKE_MS}
            firstTime={recording.attempts === 0}
            playingBack={recording.playing}
            onStart={handleStart}
            onStop={stopSpeaking}
            onListen={recording.playTake}
          />
          <LessonNextButton
            lockedBecause={canContinue ? null : t('lessonDay.perform.recordFirst')}
            onNext={onNext}
          />
        </div>
      }
    >
      <div className="flex animate-rise-in flex-col gap-4">
        {/* Lower than the usual 16:9, so the list of tasks starts higher up the screen. */}
        <ScenePicture src={picture} className="aspect-5/2" />

        <section className="flex flex-col gap-2">
          <h2 className="font-extrabold">{t('lessonDay.perform.tasks')}</h2>
          {/* Always there, so that the change to "now tick" is announced. */}
          <p role="status" className="text-fg-muted empty:hidden">
            {hasTake ? t('lessonDay.perform.selfCheck') : null}
          </p>
          <TaskChecklist
            label={t('lessonDay.perform.tasks')}
            tasks={challenge.tasks.map((task) => challengeText(task, language))}
            tickable={hasTake}
            ticked={ticked}
            onToggle={handleToggle}
          />
          {hasTake && <p className="text-sm text-fg-muted">{t('lessonDay.perform.private')}</p>}
        </section>

        {challenge.phrases.length > 0 && (
          <PhraseHelp
            phrases={challenge.phrases}
            open={helpOpen}
            onToggle={() => setHelpOpen((open) => !open)}
            // Not while recording: the device's voice would end up in the learner's take.
            onPlay={
              isSpeechSupported() && !micOpen ? (phrase) => void playback.play(phrase) : undefined
            }
          />
        )}
        {playback.status === 'failed' && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.perform.audioFailed')}
          </p>
        )}

        {recording.problem && (
          <div ref={revealOnMount}>
            <MicrophoneHelp problem={recording.problem} />
          </div>
        )}
        {!canContinue && (
          <Button variant="ghost" className="self-center" onClick={() => setCannotRecord(true)}>
            {t('lessonDay.perform.cannotRecord')}
          </Button>
        )}
      </div>
    </StepScreen>
  )
}
