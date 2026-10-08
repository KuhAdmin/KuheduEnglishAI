import { Check, Lightbulb, Volume2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'

export type QuizFeedbackProps = {
  /** The learner picked the right choice. */
  right: boolean
  /** The right choice, in English. */
  answer: string
  /** Say the answer aloud. Called from a tap. Left out when the device has no voice. */
  onPlay?: () => void
}

/**
 * What a checked quiz question comes to: a tick, or the right answer to learn from. The words
 * and the icon say which; the colour only adds to them.
 */
export function QuizFeedback({ right, answer, onPlay }: QuizFeedbackProps) {
  const t = useT()

  return (
    <div
      className={cn(
        'flex animate-fade-in items-center gap-3 rounded-xl p-4 text-fg',
        right ? 'bg-success-soft' : 'bg-warning-soft',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface',
          right ? 'text-success' : 'text-warning',
        )}
      >
        {right ? <Check className="size-5" strokeWidth={3} /> : <Lightbulb className="size-5" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-extrabold">
          {t(right ? 'lessonDay.quiz.right' : 'lessonDay.quiz.notQuite')}
        </p>
        {!right && (
          <p lang="en" className="text-lg font-extrabold wrap-break-word">
            {answer}
          </p>
        )}
      </div>
      {onPlay && (
        <IconButton variant="secondary" label={t('lessonDay.quiz.playAnswer')} onClick={onPlay}>
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </div>
  )
}
