import { Play, Snail, Volume2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import type { PlaybackStatus } from '../hooks/useSpeechPlayback'
import { BigRoundButton } from './BigRoundButton'

export type AudioPromptProps = {
  status: PlaybackStatus
  /** The learner has heard it through at least once. */
  played: boolean
  onPlay: () => void
  onPlaySlowly: () => void
  /** Leave the question when the device cannot play it. */
  onSkip: () => void
}

/** The sentence to listen to: play, play again, play slowly — and a way out if it cannot play. */
export function AudioPrompt({ status, played, onPlay, onPlaySlowly, onSkip }: AudioPromptProps) {
  const t = useT()
  const playing = status === 'playing'
  const label = playing
    ? t('placementTest.listen.playing')
    : t(played ? 'placementTest.listen.replay' : 'placementTest.listen.play')

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Once heard, the controls sit side by side to leave the screen to the answers. */}
      <div className={cn('flex items-center gap-3', played ? 'flex-row' : 'flex-col')}>
        <BigRoundButton aria-label={label} pulsing={playing} disabled={playing} onClick={onPlay}>
          {playing ? (
            <Volume2 aria-hidden="true" className="size-9" />
          ) : (
            <Play aria-hidden="true" className="size-9 translate-x-0.5" fill="currentColor" />
          )}
        </BigRoundButton>
        <div className={cn('flex flex-col', played ? 'items-start' : 'items-center')}>
          <p aria-hidden="true" className={cn('font-bold text-fg-muted', played && 'px-5')}>
            {label}
          </p>
          {played && status !== 'failed' && (
            <Button variant="ghost" disabled={playing} onClick={onPlaySlowly}>
              <Snail aria-hidden="true" className="size-5" />
              {t('placementTest.listen.slow')}
            </Button>
          )}
        </div>
      </div>

      {status === 'failed' && (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 font-bold text-danger">
            {t('placementTest.listen.failed')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={onPlay}>
              {t('placementTest.listen.retry')}
            </Button>
            <Button variant="ghost" onClick={onSkip}>
              {t('placementTest.listen.skip')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
