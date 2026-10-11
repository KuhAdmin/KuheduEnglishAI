import { TutorNarrator, type TutorNarratorProps } from '@/shared/lib/tutor/TutorNarrator'

export type JourneyTutorProps = Pick<TutorNarratorProps, 'line' | 'cheering' | 'leading'>

/**
 * The tutor at the top of a journey screen that scrolls as a whole (Home, a section): it stays
 * there while the list moves under it. It must be the screen's first element.
 *
 * The band has the tutor's own colour from edge to edge, notch included, so where the fixed part
 * ends and the list begins can be seen.
 */
export function JourneyTutor(props: JourneyTutorProps) {
  return (
    <div className="sticky-screen-top z-(--z-sticky) bg-primary-soft shadow-sm">
      {/* The band already keeps the gutter at the sides, and ends in a straight edge. */}
      <TutorNarrator {...props} className="rounded-none px-0" />
    </div>
  )
}
