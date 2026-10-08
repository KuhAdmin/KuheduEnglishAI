import { Headphones } from 'lucide-react'
import type { RecordingPhase } from '@/shared/lib/audio/useVoiceRecording'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { MicButton } from '@/shared/ui/MicButton'
import { clock } from '../lib/clock'

export type PronunciationPracticeProps = {
  /** What the panel is for, when it is not a single word's pronunciation. */
  title?: string
  /** The word to say, in English. Left out when the screen already shows what to say. */
  word?: string
  phase: RecordingPhase
  elapsedMs: number
  /** The longest a recording may run, when the screen sets a limit; shown beside the time. */
  limitMs?: number
  /** The learner has not used the microphone on this screen yet. */
  firstTime: boolean
  /** Their recording is being played back. */
  playingBack: boolean
  onStart: () => void
  onStop: () => void
  onListen: () => void
}

/**
 * Say the word (or the sentence) and hear yourself. Nothing is rated — that needs a server (TODO(backend)) — so
 * the learner compares their own recording with the device's voice by ear.
 */
export function PronunciationPractice({
  title,
  word,
  phase,
  elapsedMs,
  limitMs,
  firstTime,
  playingBack,
  onStart,
  onStop,
  onListen,
}: PronunciationPracticeProps) {
  const t = useT()
  const active = phase === 'starting' || phase === 'recording'
  const [before = '', after = ''] = t('lessonDay.practice.say').split('{word}')

  const status =
    phase === 'starting'
      ? t('lessonDay.practice.checking')
      : phase === 'recording'
        ? `${t('lessonDay.practice.recording')} ${clock(elapsedMs)}${limitMs ? ` / ${clock(limitMs)}` : ''}`
        : phase === 'recorded'
          ? t('lessonDay.practice.recorded')
          : // Said before the browser asks, so the request for the microphone is no surprise.
            t(firstTime ? 'lessonDay.practice.micNote' : 'lessonDay.practice.start')

  return (
    <section className="flex items-center gap-3 rounded-xl bg-primary-soft p-3 text-on-primary-soft">
      <MicButton
        active={active}
        recording={phase === 'recording'}
        onStart={onStart}
        onStop={onStop}
        startLabel={t('lessonDay.practice.start')}
        stopLabel={t('lessonDay.practice.stop')}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className={word ? 'text-sm font-extrabold' : 'text-lg font-extrabold'}>
          {title ?? t('lessonDay.practice.title')}
        </h2>
        {word && (
          <p className="text-lg font-extrabold wrap-break-word">
            {before}
            <span lang="en">{word}</span>
            {after}
          </p>
        )}
        <p role="status" className="text-sm">
          {status}
        </p>
      </div>
      {phase === 'recorded' && (
        <IconButton
          variant="secondary"
          label={t('lessonDay.practice.listen')}
          disabled={playingBack}
          onClick={onListen}
          className="bg-surface"
        >
          <Headphones aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </section>
  )
}
