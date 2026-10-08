import { Volume2 } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'

export type EnglishAnswerProps = {
  /** The sentence in English. */
  english: string
  /** Say it aloud. Called from a tap. Left out when the device has no voice. */
  onPlay?: () => void
}

/** The English a sentence comes to, shown once the learner has tried or asked for it. */
export function EnglishAnswer({ english, onPlay }: EnglishAnswerProps) {
  const t = useT()

  return (
    <section className="flex animate-fade-in items-center gap-3 rounded-xl border-2 border-primary bg-surface p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-sm font-extrabold text-fg-muted">{t('lessonDay.translate.answer')}</h2>
        <p lang="en" className="text-lg font-extrabold wrap-break-word">
          {english}
        </p>
      </div>
      {onPlay && (
        <IconButton
          variant="secondary"
          label={t('lessonDay.translate.playAnswer')}
          onClick={onPlay}
        >
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </section>
  )
}
