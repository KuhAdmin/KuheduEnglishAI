import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { LessonDayProgress } from './LessonDayProgress'
import { PartnerAvatar } from './PartnerAvatar'

export type PartnerBandProps = {
  /** Where the back arrow leads: the week's overview, or the list the role-play was opened from. */
  backTo: string
  /** What the back arrow is called, when it does not lead to the week. */
  backLabel?: string
  /** This day's place in the week, e.g. 4 of 7. */
  day: number
  dayCount: number
  /** The partner's own picture, when an admin gave them one; else the learner's tutor plays them. */
  imageUrl: string | null
  /** The partner's line is being said right now. */
  speaking: boolean
}

/**
 * What a role-play keeps in view while the conversation scrolls under it, for a `StepScreen`'s
 * band (`topBarTone="soft"`): the partner's face first, with the way back laid over the start of
 * its row, then the day's place in the week. It is the week's overview's band with the partner
 * in the tutor's place, and padded like it, so the face is where the tutor's is on that screen
 * and does not move as the learner goes from one to the other, or from turn to turn.
 *
 * There is no speech bubble and no mute button: the partner's lines are the conversation itself,
 * each with a button to hear it again.
 */
export function PartnerBand({
  backTo,
  backLabel,
  day,
  dayCount,
  imageUrl,
  speaking,
}: PartnerBandProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-3 pt-3 pb-4">
      {/* The control is laid over the row's start, so the face stays in the middle. */}
      <div className="relative flex w-full justify-center">
        <div className="absolute inset-s-0 top-0">
          {/* The variant drawn for the band's colour. */}
          <IconButton asChild variant="secondary" label={backLabel ?? t('lessonDay.back')}>
            <Link to={backTo}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
        </div>
        <PartnerAvatar imageUrl={imageUrl} speaking={speaking} />
      </div>
      <div className="flex items-center gap-3">
        <LessonDayProgress
          day={day}
          dayCount={dayCount}
          withPreviousDay={backLabel === undefined}
          onBand
        />
      </div>
    </div>
  )
}
