import { ArrowRight } from 'lucide-react'
import { Link, type To } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { LessonNextButton } from './LessonNextButton'

export type OptionalDayActionsProps = {
  /** What there is to practise next, and where it opens; left out when nothing is left. */
  practise?: { label: string; to: To }
  /** The learner has done something on this day. */
  started: boolean
  /** Finish the day. Skipping it does the same: the day is optional. */
  onNext: () => void
}

/**
 * The pinned actions of an optional day (Days 6 and 7), which keep their places: the upper one
 * leads on to practice, the lower one leaves — "Skip this day" before anything is done, "Next"
 * after.
 */
export function OptionalDayActions({ practise, started, onNext }: OptionalDayActionsProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-3">
      {practise && (
        <Button asChild size="lg" fullWidth variant={started ? 'secondary' : 'primary'}>
          <Link to={practise.to}>
            {practise.label}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </Button>
      )}
      {started ? (
        <LessonNextButton lockedBecause={null} onNext={onNext} />
      ) : (
        <Button variant="ghost" fullWidth onClick={onNext}>
          {t('lessonDay.skip')}
        </Button>
      )}
    </div>
  )
}
