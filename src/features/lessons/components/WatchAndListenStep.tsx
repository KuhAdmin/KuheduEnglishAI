import { ArrowLeft, ArrowRight, MessagesSquare, ScrollText } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { lineTranslation, type WeekDialogue } from '@/shared/lib/curriculum/weekDialogues'
import { formatNumber, isEnglish, useLanguage, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { StepScreen } from '@/shared/ui/StepScreen'
import { SLOW_RATE, useConversationPlayback } from '../hooks/useConversationPlayback'
import { ConversationMedia } from './ConversationMedia'
import { DialogueLines } from './DialogueLines'

type View = 'dialogue' | 'transcript'

export type WatchAndListenStepProps = {
  dialogue: WeekDialogue
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This step's place in the day, e.g. 1 of 6. */
  step: number
  stepCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** The learner heard the conversation through once before, so nothing is locked. */
  heardBefore: boolean
  /** The conversation was just heard (or watched) to its end. */
  onHeard: () => void
  onNext: () => void
}

/**
 * "Watch and listen": the week's conversation, played and written out. "Next" opens once the
 * learner has heard it through — or at once on a device that cannot play it, which must not
 * trap them.
 */
export function WatchAndListenStep({
  dialogue,
  picture,
  step,
  stepCount,
  backTo,
  heardBefore,
  onHeard,
  onNext,
}: WatchAndListenStepProps) {
  const t = useT()
  const language = useLanguage()
  const hintId = useId()
  const playback = useConversationPlayback(dialogue.lines)
  const [view, setView] = useState<View>('dialogue')
  // A video that will not play gives way to the device's voice.
  const [failedVideo, setFailedVideo] = useState<string | null>(null)
  const videoUrl = dialogue.videoUrl === failedVideo ? null : dialogue.videoUrl

  // The transcript adds the learner's own language, so it needs one, and lines written in it.
  const hasTranscript =
    !isEnglish(language) && dialogue.lines.some((line) => lineTranslation(line, language))
  const showTranscript = hasTranscript && view === 'transcript'

  const cannotPlay = videoUrl === null && (playback.status === 'failed' || !isSpeechSupported())
  const canContinue = heardBefore || cannotPlay
  const speaking = playback.status === 'playing'

  const handlePlay = async (slowly: boolean) => {
    if (await playback.playConversation(slowly ? SLOW_RATE : 1)) onHeard()
  }

  const count = (value: number) => formatNumber(language, value)

  return (
    <StepScreen
      title={t('lessonDay.watch.title')}
      subtitle={t('lessonDay.watch.subtitle')}
      topBar={
        <div className="flex items-center gap-3">
          <IconButton asChild label={t('lessonDay.back')} className="-ms-2">
            <Link to={backTo}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
          <ProgressBar
            className="flex-1"
            value={step / stepCount}
            label={t('lessonDay.progressLabel')}
          />
          <p aria-hidden="true" className="text-sm font-bold text-fg-muted tabular-nums">
            {count(step)}/{count(stepCount)}
          </p>
        </div>
      }
      footer={
        <div className="flex flex-col gap-2">
          <p id={hintId} role="status" className="text-center text-sm text-fg-muted empty:hidden">
            {!canContinue && t('lessonDay.watch.listenFirst')}
          </p>
          <Button
            size="lg"
            fullWidth
            disabled={!canContinue}
            aria-describedby={canContinue ? undefined : hintId}
            onClick={onNext}
          >
            {t('lessonDay.next')}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      }
    >
      <div className="flex animate-rise-in flex-col gap-4">
        <ConversationMedia
          videoUrl={videoUrl}
          picture={picture}
          speaking={speaking}
          linesPlayed={playback.linesPlayed}
          lineCount={dialogue.lines.length}
          onPlay={handlePlay}
          onStop={playback.stop}
          onVideoPlay={playback.stop}
          onVideoEnded={onHeard}
          onVideoError={() => setFailedVideo(dialogue.videoUrl)}
        />

        {cannotPlay && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.watch.audioFailed')}
          </p>
        )}

        {hasTranscript && (
          <SegmentedControl<View>
            legend={t('lessonDay.watch.view')}
            fullWidth
            value={view}
            onChange={setView}
            options={[
              {
                value: 'dialogue',
                label: (
                  <span className="flex items-center gap-2">
                    <MessagesSquare aria-hidden="true" className="size-4" />
                    {t('lessonDay.watch.dialogue')}
                  </span>
                ),
              },
              {
                value: 'transcript',
                label: (
                  <span className="flex items-center gap-2">
                    <ScrollText aria-hidden="true" className="size-4" />
                    {t('lessonDay.watch.transcript')}
                  </span>
                ),
              },
            ]}
          />
        )}

        <DialogueLines
          label={t('lessonDay.watch.conversation')}
          lines={dialogue.lines}
          translateTo={showTranscript ? language : null}
          currentLine={playback.currentLine}
          playLineLabel={t('lessonDay.watch.playLine')}
          onPlayLine={(index) => void playback.playLine(index)}
        />
      </div>
    </StepScreen>
  )
}
