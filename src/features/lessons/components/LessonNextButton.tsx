import { ArrowRight } from 'lucide-react'
import { useId } from 'react'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'

export type LessonNextButtonProps = {
  /** What the learner still has to do before going on; `null` when nothing. */
  lockedBecause: string | null
  onNext: () => void
}

/** The pinned "Next" of a lesson day. While it is locked it says why, right above itself. */
export function LessonNextButton({ lockedBecause, onNext }: LessonNextButtonProps) {
  const t = useT()
  const hintId = useId()
  const locked = lockedBecause !== null

  return (
    <div className="flex flex-col gap-2">
      <p id={hintId} role="status" className="text-center text-sm text-fg-muted empty:hidden">
        {lockedBecause}
      </p>
      <Button
        size="lg"
        fullWidth
        disabled={locked}
        aria-describedby={locked ? hintId : undefined}
        onClick={onNext}
      >
        {t('lessonDay.next')}
        <ArrowRight aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}
