import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { LessonDayProgress } from './LessonDayProgress'

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
 * back to the day before, to go through it again. A role-play has the same in a band with the
 * partner's face (`PartnerBand`).
 */
export function LessonTopBar({ backTo, backLabel, day, dayCount }: LessonTopBarProps) {
  const t = useT()

  return (
    <div className="flex items-center gap-3">
      <IconButton asChild label={backLabel ?? t('lessonDay.back')} className="-ms-2">
        <Link to={backTo}>
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
      </IconButton>
      <LessonDayProgress day={day} dayCount={dayCount} withPreviousDay={backLabel === undefined} />
    </div>
  )
}
