import { Play, Snail, Square } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { BigRoundButton } from '@/shared/ui/BigRoundButton'
import { Button } from '@/shared/ui/Button'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { ScenePicture } from '@/shared/ui/ScenePicture'

export type ConversationMediaProps = {
  /** A video of the conversation; without one the device reads it aloud. */
  videoUrl: string | null
  /** The picture of the situation: the video's poster, or what is shown while the voice reads. */
  picture: string | null
  /** The device's voice is speaking right now (the conversation or one line of it). */
  speaking: boolean
  /** How many lines of the conversation the voice has said, out of `lineCount`. */
  linesPlayed: number
  lineCount: number
  /** `slowly` asks for slower speech. Called from a tap. */
  onPlay: (slowly: boolean) => void
  onStop: () => void
  /** The video started: anything the voice is saying must stop. */
  onVideoPlay: () => void
  /** The video was watched to its end. */
  onVideoEnded: () => void
  /** The video cannot be played. */
  onVideoError: () => void
}

/**
 * What the learner watches or listens to: the conversation's video, or — with no video — the
 * situation's picture with a play button, while the device's voice reads the lines.
 */
export function ConversationMedia({
  videoUrl,
  picture,
  speaking,
  linesPlayed,
  lineCount,
  onPlay,
  onStop,
  onVideoPlay,
  onVideoEnded,
  onVideoError,
}: ConversationMediaProps) {
  const t = useT()
  const language = useLanguage()
  const video = useRef<HTMLVideoElement>(null)

  // One sound at a time: a line heard again must not talk over the video.
  useEffect(() => {
    if (speaking) video.current?.pause()
  }, [speaking])

  if (videoUrl !== null) {
    return (
      // There are no timed captions to offer yet: the conversation is written out in full right
      // under the video, in English and in the learner's language. TODO(content): caption files.
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        ref={video}
        src={videoUrl}
        poster={picture ?? undefined}
        controls
        playsInline
        preload="metadata"
        onPlay={onVideoPlay}
        onEnded={onVideoEnded}
        onError={onVideoError}
        className="aspect-video w-full shrink-0 rounded-xl bg-surface-sunken"
      />
    )
  }

  const count = (value: number) => formatNumber(language, value)

  return (
    <div className="flex flex-col gap-2">
      <ScenePicture src={picture}>
        <BigRoundButton
          aria-label={t(speaking ? 'lessonDay.watch.stop' : 'lessonDay.watch.play')}
          pulsing={speaking}
          onClick={() => (speaking ? onStop() : onPlay(false))}
        >
          {speaking ? (
            <Square aria-hidden="true" className="size-7" fill="currentColor" />
          ) : (
            <Play aria-hidden="true" className="size-9 translate-x-0.5" fill="currentColor" />
          )}
        </BigRoundButton>
      </ScenePicture>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          className="-ms-3 px-3"
          disabled={speaking}
          onClick={() => onPlay(true)}
        >
          <Snail aria-hidden="true" className="size-5" />
          {t('lessonDay.watch.slow')}
        </Button>
        <ProgressBar
          className="flex-1"
          value={lineCount === 0 ? 0 : linesPlayed / lineCount}
          label={t('lessonDay.watch.playedLabel')}
        />
        <p aria-hidden="true" className="text-sm font-bold text-fg-muted tabular-nums">
          {count(linesPlayed)}/{count(lineCount)}
        </p>
      </div>
    </div>
  )
}
