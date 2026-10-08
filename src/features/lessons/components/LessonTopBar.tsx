import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { ProgressBar } from '@/shared/ui/ProgressBar'

export type LessonTopBarProps = {
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** What the back arrow is called, when it leads somewhere else (back to the review's list). */
  backLabel?: string
  /** This day's place in the week, e.g. 2 of 7. */
  day: number
  dayCount: number
}

/** Top of every lesson day: back to the week, and how far through the week this day is. */
export function LessonTopBar({ backTo, backLabel, day, dayCount }: LessonTopBarProps) {
  const t = useT()
  const language = useLanguage()

  return (
    <div className="flex items-center gap-3">
      <IconButton asChild label={backLabel ?? t('lessonDay.back')} className="-ms-2">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
      </IconButton>
      <ProgressBar className="flex-1" value={day / dayCount} label={t('lessonDay.progressLabel')} />
      <p aria-hidden="true" className="text-sm font-bold text-fg-muted tabular-nums">
        {formatNumber(language, day)}/{formatNumber(language, dayCount)}
      </p>
    </div>
  )
}
