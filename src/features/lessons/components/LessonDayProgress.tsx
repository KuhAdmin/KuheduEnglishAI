import { ChevronLeft } from 'lucide-react'
import { generatePath, Link, useParams } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { ProgressBar } from '@/shared/ui/ProgressBar'

export type LessonDayProgressProps = {
  /** This day's place in the week, e.g. 2 of 7. */
  day: number
  dayCount: number
  /**
   * Whether there is a way back to the day before. Only on the day's own screen: inside one of
   * its parts (a review activity, a challenge under way) the back arrow leads to the day, and a
   * second way out would be one too many.
   */
  withPreviousDay: boolean
  /** Drawn on a band in the soft primary colour, whose own text colour the count then takes. */
  onBand?: boolean
}

/**
 * How far through the week a day is: a bar, the count beside it and, between them, a way back
 * to the day before, to go through it again. Laid out by whoever holds it, in a row.
 */
export function LessonDayProgress({
  day,
  dayCount,
  withPreviousDay,
  onBand = false,
}: LessonDayProgressProps) {
  const t = useT()
  const language = useLanguage()
  const { week } = useParams()
  // Within the week only: Day 1 has the week's overview behind it.
  const previous =
    withPreviousDay && week !== undefined && day > 1
      ? {
          number: formatNumber(language, day - 1),
          path: generatePath(paths.lessonDay, { week, day: String(day - 1) }),
        }
      : null

  return (
    <>
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
      <p
        aria-hidden="true"
        className={cn(
          'text-sm font-bold tabular-nums',
          onBand ? 'text-on-primary-soft' : 'text-fg-muted',
        )}
      >
        {formatNumber(language, day)}/{formatNumber(language, dayCount)}
      </p>
    </>
  )
}
