import { ArrowLeft, ChevronLeft } from 'lucide-react'
import { generatePath, Link, useParams } from 'react-router'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
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

/**
 * Top of every lesson day: back to the week, how far through the week this day is, and a way
 * back to the day before, to go through it again.
 */
export function LessonTopBar({ backTo, backLabel, day, dayCount }: LessonTopBarProps) {
  const t = useT()
  const language = useLanguage()
  const { week } = useParams()
  // Only on the day's own screen: inside one of its parts (a review activity, a challenge under
  // way) the back arrow leads to the day, and a second way out would be one too many. Within the
  // week only: Day 1 has the week's overview behind it.
  const previous =
    backLabel === undefined && week !== undefined && day > 1
      ? {
          number: formatNumber(language, day - 1),
          path: generatePath(paths.lessonDay, { week, day: String(day - 1) }),
        }
      : null

  return (
    <div className="flex items-center gap-3">
      <IconButton asChild label={backLabel ?? t('lessonDay.back')} className="-ms-2">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
      </IconButton>
      <ProgressBar className="flex-1" value={day / dayCount} label={t('lessonDay.progressLabel')} />
      {previous && (
        <Button
          asChild
          variant="outline"
          size="sm"
          aria-label={fillText(t('lessonDay.previousDayLabel'), { day: previous.number })}
        >
          <Link to={previous.path}>
            <ChevronLeft aria-hidden="true" className="-ms-1 size-4" />
            {fillText(t('lessonDay.previousDay'), { day: previous.number })}
          </Link>
        </Button>
      )}
      <p aria-hidden="true" className="text-sm font-bold text-fg-muted tabular-nums">
        {formatNumber(language, day)}/{formatNumber(language, dayCount)}
      </p>
    </div>
  )
}
