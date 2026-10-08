import { Headphones, RotateCcw, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { fillText, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { useItemTranslation } from '../hooks/useItemTranslation'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoiceRecording } from '../hooks/useVoiceRecording'
import type { SpeakItem } from '../lib/itemSchema'
import { usePlacementStore, type AnswerInput } from '../store/usePlacementStore'
import { HelpPanel } from './HelpPanel'
import { MicButton } from './MicButton'
import { MicrophoneHelp } from './MicrophoneHelp'
import { QuestionFooter } from './QuestionFooter'
import { TestFrame } from './TestFrame'

const clock = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export type SpeakQuestionProps = {
  item: SpeakItem
  onPause: () => void
}

/**
 * One speaking prompt: hear it, record an answer, listen back, try again.
 * The recording is not rated (TODO(backend)) — only that the learner answered, and with how
 * much help, is kept.
 */
export function SpeakQuestion({ item, onPause }: SpeakQuestionProps) {
  const t = useT()
  const haptic = useHaptics()
  const submitAnswer = usePlacementStore((state) => state.submitAnswer)
  const skipStage = usePlacementStore((state) => state.skipStage)
  const track = usePlacementStore((state) => state.track)
  const playback = useSpeechPlayback()
  const recording = useVoiceRecording()
  const translation = useItemTranslation(item)

  const [promptPlays, setPromptPlays] = useState(0)
  const [helpOpened, setHelpOpened] = useState(false)
  const [modelPlayed, setModelPlayed] = useState(false)
  const [translationUsed, setTranslationUsed] = useState(false)
  const shownAt = useRef(0)
  useEffect(() => {
    shownAt.current = performance.now()
  }, [])

  const { phase } = recording
  const active = phase === 'starting' || phase === 'recording'

  const handleStart = () => {
    // The device's own voice must not end up in the learner's recording.
    playback.stop()
    haptic('recordStart')
    track('placement_speech_started')
    void recording.start()
  }
  const handleStop = () => {
    haptic('recordStop')
    track('placement_speech_completed')
    recording.stop()
  }

  const finish = (answer: AnswerInput) => {
    playback.stop()
    submitAnswer({
      timeTakenMs: performance.now() - shownAt.current,
      playCount: promptPlays,
      helpOpened,
      modelPlayed,
      translationOffered: helpOpened && translation !== null,
      translationUsed,
      recordingAttempts: recording.attempts,
      recordingDurationMs: recording.take?.durationMs ?? 0,
      ...answer,
    })
  }

  const status =
    phase === 'starting'
      ? t('placementTest.speak.checking')
      : phase === 'recording'
        ? `${t('placementTest.speak.recording')} ${clock(recording.elapsedMs)}`
        : phase === 'recorded'
          ? t('placementTest.speak.recorded')
          : t('placementTest.speak.tapToSpeak')

  return (
    <TestFrame
      title={t('placementTest.speak.instruction')}
      onPause={onPause}
      footer={
        <QuestionFooter
          canContinue={phase === 'recorded'}
          onContinue={() => finish({})}
          helpOpened={helpOpened}
          onOpenHelp={() => {
            setHelpOpened(true)
            track('placement_hint_used')
          }}
        />
      }
    >
      <div className="flex flex-col items-center gap-5">
        <div className="flex w-full flex-col items-center gap-2 rounded-lg bg-primary-soft px-4 py-5">
          <p lang="en" className="text-center text-2xl font-extrabold text-on-primary-soft">
            {item.prompt}
          </p>
          <Button
            variant="ghost"
            disabled={active || playback.status === 'playing'}
            onClick={() => {
              setPromptPlays((count) => count + 1)
              void playback.play(item.prompt)
            }}
          >
            <Volume2 aria-hidden="true" className="size-5" />
            {t('placementTest.speak.hearIt')}
          </Button>
        </div>

        <MicButton
          active={active}
          recording={phase === 'recording'}
          onStart={handleStart}
          onStop={handleStop}
          startLabel={t('placementTest.speak.tapToSpeak')}
          stopLabel={t('placementTest.speak.stop')}
        />
        <p role="status" className="text-center font-bold text-fg-muted">
          {status}
        </p>

        {phase === 'recorded' && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" disabled={recording.playing} onClick={recording.playTake}>
              <Headphones aria-hidden="true" className="size-5" />
              {t('placementTest.speak.listen')}
            </Button>
            <Button variant="ghost" onClick={handleStart}>
              <RotateCcw aria-hidden="true" className="size-5" />
              {t('placementTest.speak.tryAgain')}
            </Button>
          </div>
        )}

        {recording.problem && (
          <MicrophoneHelp problem={recording.problem}>
            <Button variant="outline" fullWidth onClick={handleStart}>
              {t('placementTest.speak.checkMic')}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              onClick={() =>
                skipStage(
                  recording.problem === 'denied' ? 'microphoneDenied' : 'microphoneUnavailable',
                )
              }
            >
              {t('placementTest.speak.without')}
            </Button>
          </MicrophoneHelp>
        )}

        {helpOpened && (
          <div className="w-full">
            <HelpPanel
              title={t('placementTest.help.title')}
              revealed={
                translationUsed && translation
                  ? [
                      {
                        label: translation.languageName,
                        text: translation.text,
                        lang: translation.language,
                      },
                    ]
                  : []
              }
            >
              <Button
                variant="outline"
                fullWidth
                disabled={active || playback.status === 'playing'}
                onClick={() => {
                  setModelPlayed(true)
                  void playback.play(item.modelAnswer)
                }}
              >
                {t('placementTest.help.example')}
              </Button>
              {translation && !translationUsed && (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setTranslationUsed(true)
                    track('placement_translation_used')
                  }}
                >
                  {fillText(t('placementTest.help.translate'), {
                    language: translation.languageName,
                  })}
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={() => finish({ skipped: 'declined' })}>
                {t('placementTest.speak.cantAnswer')}
              </Button>
            </HelpPanel>
          </div>
        )}
      </div>
    </TestFrame>
  )
}
