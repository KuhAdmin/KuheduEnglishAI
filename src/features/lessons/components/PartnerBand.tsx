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
  /**
   * The conversation has begun: the partner's face is now beside each of their lines, and the
   * band gives its room to the conversation.
   */
  talking: boolean
}

/**
 * What a role-play keeps in view, for a `StepScreen`'s band (`topBarTone="soft"`).
 *
 * **Before the conversation** it is the week's overview's band with the partner in the tutor's
 * place, and padded like it: the face first, with the way back laid over the start of its row,
 * then the day's place in the week. So the face is where the tutor's is on that screen, and the
 * learner meets who they will talk to.
 *
 * **Once it has begun** the band is one row, the way back and the day's place: the face has
 * moved into the conversation (`TalkTranscript`), and what stays fixed is as little as it can
 * be, because the conversation is what the screen is for.
 */
export function PartnerBand({
  backTo,
  backLabel,
  day,
  dayCount,
  imageUrl,
  talking,
}: PartnerBandProps) {
  const t = useT()

  const back = (
    // The variant drawn for the band's colour.
    <IconButton asChild variant="secondary" label={backLabel ?? t('lessonDay.back')}>
      <Link to={backTo}>
        <ArrowLeft aria-hidden="true" className="size-6" />
      </Link>
    </IconButton>
  )
  const progress = (
    <LessonDayProgress
      day={day}
      dayCount={dayCount}
      withPreviousDay={backLabel === undefined}
      onBand
    />
  )

  if (talking) {
    return (
      <div className="flex items-center gap-3 py-2">
        {back}
        {progress}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 pt-3 pb-4">
      {/* The control is laid over the row's start, so the face stays in the middle. */}
      <div className="relative flex w-full justify-center">
        <div className="absolute inset-s-0 top-0">{back}</div>
        <PartnerAvatar imageUrl={imageUrl} speaking={false} />
      </div>
      <div className="flex items-center gap-3">{progress}</div>
    </div>
  )
}
