import { generatePath } from 'react-router'
import { paths } from '@/shared/lib/paths'

export type JourneyProgress = {
  /** The week the learner is working on, 1 to 50. */
  currentWeek: number
  /** Sections the learner has finished. */
  completedSections: readonly number[]
}

/**
 * Where the learner is on the journey.
 *
 * STOP-GAP: every learner is at Week 1 and has completed nothing. That is a deliberate
 * placeholder, and it goes against the rule that placement must not send everyone to Week 1.
 * TODO(placement): start from the placement result (`usePlacementResult`) once it is decided
 * which section each level starts in.
 * TODO(lessons): move on, and mark sections completed, as lessons are finished.
 */
export function useJourneyProgress(): JourneyProgress {
  return { currentWeek: 1, completedSections: [] }
}

export const sectionPath = (section: number) =>
  generatePath(paths.homeSection, { section: String(section) })

export const weekPath = (week: number) => generatePath(paths.homeWeek, { week: String(week) })

export const lessonDayPath = (week: number, day: number) =>
  generatePath(paths.lessonDay, { week: String(week), day: String(day) })
