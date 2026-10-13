import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { DAYS_PER_WEEK, isDayNumber, isWeekNumber } from '../curriculum/curriculum'
import { isReviewPart, REVIEW_PARTS, type ReviewPart } from '../curriculum/weekReviews'
import { MAX_SCENARIOS } from '../curriculum/weekScenarios'

export type LessonProgress = {
  /** Weeks whose opening conversation (Day 1) the learner has heard through once. */
  heardWeeks: number[]
  /** The days the learner has finished, by week number. */
  doneDays: Partial<Record<number, number[]>>
  /** The parts of a week's review (Day 6) the learner has done, by week number. */
  reviewParts: Partial<Record<number, ReviewPart[]>>
  /**
   * The scenarios of a week's real-world challenge (Day 7) the learner has taken to the end, by
   * week number: their places in the week's list, from 0.
   */
  scenariosDone: Partial<Record<number, number[]>>
}

type LessonProgressState = LessonProgress & {
  markHeard: (week: number) => void
  markDayDone: (week: number, day: number) => void
  markReviewPartDone: (week: number, part: ReviewPart) => void
  markScenarioDone: (week: number, scenario: number) => void
}

/** Whether anything in the lessons was heard or finished in this browser: someone has begun. */
export function hasLessonProgress(): boolean {
  const { heardWeeks, doneDays, reviewParts, scenariosDone } = useLessonProgressStore.getState()
  return (
    heardWeeks.length > 0 ||
    [doneDays, reviewParts, scenariosDone].some((byWeek) => Object.keys(byWeek).length > 0)
  )
}

/** The first day of a week not finished yet; Day 1 again once the whole week is done. */
export function nextLessonDay(done: readonly number[] = []): number {
  for (let day = 1; day <= DAYS_PER_WEEK; day += 1) {
    if (!done.includes(day)) return day
  }
  return 1
}

/** Every day of the week is finished (an optional day counts once done or skipped). */
export function isWeekDone(done: readonly number[] = []): boolean {
  for (let day = 1; day <= DAYS_PER_WEEK; day += 1) {
    if (!done.includes(day)) return false
  }
  return true
}

const isScenarioPlace = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 0 && (value as number) < MAX_SCENARIOS

function validDoneDays(saved: unknown): LessonProgress['doneDays'] {
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  const doneDays: LessonProgress['doneDays'] = {}
  for (const [week, days] of Object.entries(saved)) {
    if (!isWeekNumber(Number(week)) || !Array.isArray(days)) continue
    const kept = [...new Set(days.filter(isDayNumber))].sort((a, b) => a - b)
    if (kept.length > 0) doneDays[Number(week)] = kept
  }
  return doneDays
}

function validReviewParts(saved: unknown): LessonProgress['reviewParts'] {
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  const reviewParts: LessonProgress['reviewParts'] = {}
  for (const [week, parts] of Object.entries(saved)) {
    if (!isWeekNumber(Number(week)) || !Array.isArray(parts)) continue
    const kept = REVIEW_PARTS.filter((part) => parts.includes(part))
    if (kept.length > 0) reviewParts[Number(week)] = kept
  }
  return reviewParts
}

function validScenariosDone(saved: unknown): LessonProgress['scenariosDone'] {
  if (typeof saved !== 'object' || saved === null || Array.isArray(saved)) return {}
  const scenariosDone: LessonProgress['scenariosDone'] = {}
  for (const [week, places] of Object.entries(saved)) {
    if (!isWeekNumber(Number(week)) || !Array.isArray(places)) continue
    const kept = [...new Set(places.filter(isScenarioPlace))].sort((a, b) => a - b)
    if (kept.length > 0) scenariosDone[Number(week)] = kept
  }
  return scenariosDone
}

/** Nothing heard and nothing done: a learner who has not begun, or a browser that is nobody's. */
export const NO_LESSON_PROGRESS: LessonProgress = {
  heardWeeks: [],
  doneDays: {},
  reviewParts: {},
  scenariosDone: {},
}

/**
 * Progress from somewhere it cannot be trusted as it is (this browser's storage at some earlier
 * time, the account as another build left it): only what is still a week, a day, a part of the
 * review and a place in the list of scenarios is kept.
 */
export function readLessonProgress(saved: unknown): LessonProgress {
  const from = (saved ?? {}) as Partial<Record<keyof LessonProgress, unknown>>
  return {
    heardWeeks: Array.isArray(from.heardWeeks)
      ? [...new Set(from.heardWeeks.filter(isWeekNumber))]
      : [],
    doneDays: validDoneDays(from.doneDays),
    reviewParts: validReviewParts(from.reviewParts),
    scenariosDone: validScenariosDone(from.scenariosDone),
  }
}

const together = (
  one: Partial<Record<number, unknown[]>>,
  other: Partial<Record<number, unknown[]>>,
) =>
  Object.fromEntries(
    [...new Set([...Object.keys(one), ...Object.keys(other)])].map((week) => [
      week,
      [...(one[Number(week)] ?? []), ...(other[Number(week)] ?? [])],
    ]),
  )

/**
 * Everything done according to either of two records of it. Progress is only ever added to, so
 * what a phone did and what the account already holds are simply both true.
 */
export function joinLessonProgress(one: LessonProgress, other: unknown): LessonProgress {
  const more = readLessonProgress(other)
  return readLessonProgress({
    heardWeeks: [...one.heardWeeks, ...more.heardWeeks],
    doneDays: together(one.doneDays, more.doneDays),
    reviewParts: together(one.reviewParts, more.reviewParts),
    scenariosDone: together(one.scenariosDone, more.scenariosDone),
  })
}

/**
 * What the learner has done in the lessons, kept in this browser and, for someone signed in,
 * with their account (`shared/lib/learnerData`). Shared because the journey (which day a week
 * opens next) and the lessons (what to unlock) both read it.
 * TODO(lessons): feed the journey's current week from this.
 */
export const useLessonProgressStore = create<LessonProgressState>()(
  persist(
    (set) => ({
      ...NO_LESSON_PROGRESS,
      markHeard: (week) =>
        set(({ heardWeeks }) =>
          heardWeeks.includes(week) ? { heardWeeks } : { heardWeeks: [...heardWeeks, week] },
        ),
      markDayDone: (week, day) =>
        set(({ doneDays }) => {
          const done = doneDays[week] ?? []
          if (done.includes(day)) return { doneDays }
          return { doneDays: { ...doneDays, [week]: [...done, day].sort((a, b) => a - b) } }
        }),
      markReviewPartDone: (week, part) =>
        set(({ reviewParts }) => {
          const done = reviewParts[week] ?? []
          if (done.includes(part) || !isReviewPart(part)) return { reviewParts }
          // In the order the review lists them, whatever order they were done in.
          const kept = REVIEW_PARTS.filter((other) => other === part || done.includes(other))
          return { reviewParts: { ...reviewParts, [week]: kept } }
        }),
      markScenarioDone: (week, scenario) =>
        set(({ scenariosDone }) => {
          const done = scenariosDone[week] ?? []
          if (done.includes(scenario) || !isScenarioPlace(scenario)) return { scenariosDone }
          const kept = [...done, scenario].sort((a, b) => a - b)
          return { scenariosDone: { ...scenariosDone, [week]: kept } }
        }),
    }),
    {
      name: 'kuhedu-lessons',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ heardWeeks, doneDays, reviewParts, scenariosDone }): LessonProgress => ({
        heardWeeks,
        doneDays,
        reviewParts,
        scenariosDone,
      }),
      // Saved by this browser at some earlier time.
      merge: (persisted, current) => ({ ...current, ...readLessonProgress(persisted) }),
    },
  ),
)
