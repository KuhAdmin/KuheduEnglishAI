import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { StepScreen } from '@/shared/ui/StepScreen'
import { Button } from '@/shared/ui/Button'
import { LessonNextButton } from './LessonNextButton'
import { ReviewBadge } from './ReviewBadge'

export type ReviewPartDoneProps = {
  title: string
  subtitle: string
  topBar: ReactNode
  /** What doing it once more is called, e.g. "Try the quiz again". */
  againLabel: string
  onAgain: () => void
  /** Back to the review's list, with this part ticked. */
  onNext: () => void
}

/** A ref callback: what a screen has just turned into is announced by moving focus to it. */
const focusOnMount = (element: HTMLElement | null) => element?.focus()

/** The end of a part of the review that is worked through (the quiz, the flashcards). */
export function ReviewPartDone({
  title,
  subtitle,
  topBar,
  againLabel,
  onAgain,
  onNext,
}: ReviewPartDoneProps) {
  return (
    <StepScreen
      media={<ReviewBadge />}
      title={title}
      subtitle={subtitle}
      subtitleTone="strong"
      headingRef={focusOnMount}
      topBar={topBar}
      footer={
        <div className="flex flex-col gap-3">
          <Button variant="secondary" size="lg" fullWidth onClick={onAgain}>
            <RotateCcw aria-hidden="true" className="size-5" />
            {againLabel}
          </Button>
          <LessonNextButton lockedBecause={null} onNext={onNext} />
        </div>
      }
    >
      {null}
    </StepScreen>
  )
}
