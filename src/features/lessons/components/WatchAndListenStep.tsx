import { MessagesSquare, ScrollText } from 'lucide-react'
import { useState } from 'react'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { lineTranslation, type WeekDialogue } from '@/shared/lib/curriculum/weekDialogues'
import { isEnglish, useLanguage, useT } from '@/shared/lib/i18n'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { StepScreen } from '@/shared/ui/StepScreen'
import { SLOW_RATE, useConversationPlayback } from '../hooks/useConversationPlayback'
import { ConversationMedia } from './ConversationMedia'
import { DialogueLines } from './DialogueLines'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'

type View = 'dialogue' | 'transcript'

export type WatchAndListenStepProps = {
  dialogue: WeekDialogue
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This day's place in the week, e.g. 1 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** What the back arrow is called, when it does not lead to the week. */
  backLabel?: string
  /** The heading, when this is not Day 1 (the review's listening practice). */
  title?: string
  subtitle?: string
  /** The learner heard the conversation through once before, so nothing is locked. */
  heardBefore: boolean
  /** The conversation was just heard (or watched) to its end. */
  onHeard: () => void
  onNext: () => void
}

/**
 * Day 1, "Watch and listen" (and the listening practice of Day 6's review, with another
 * conversation): the week's conversation, played and written out. "Next" opens once
 * the learner has heard it through — or at once on a device that cannot play it, which must not
 * trap them.
 */
export function WatchAndListenStep({
  dialogue,
  picture,
  day,
  dayCount,
  backTo,
  backLabel,
  title,
  subtitle,
  heardBefore,
  onHeard,
  onNext,
}: WatchAndListenStepProps) {
  const t = useT()
  const language = useLanguage()
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

  return (
    <StepScreen
      title={title ?? t('lessonDay.watch.title')}
      subtitle={subtitle ?? t('lessonDay.watch.subtitle')}
      topBar={<LessonTopBar backTo={backTo} backLabel={backLabel} day={day} dayCount={dayCount} />}
      footer={
        <LessonNextButton
          lockedBecause={canContinue ? null : t('lessonDay.watch.listenFirst')}
          onNext={onNext}
        />
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
