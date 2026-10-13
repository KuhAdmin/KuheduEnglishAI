import { LESSON_MARKS_MAX, type LessonMark } from '@kuhedu/contracts'
import {
  joinLessonProgress,
  NO_LESSON_PROGRESS,
  readLessonProgress,
  useLessonProgressStore,
  type LessonProgress,
} from '../learner/lessonProgress'
import { addMarks } from './api'
import { registerLearnerPart } from './parts'

/** Progress as the server keeps it: one mark per thing done. */
export function marksOf(progress: LessonProgress): LessonMark[] {
  const byWeek = (
    record: Partial<Record<number, readonly (number | string)[]>>,
    kind: LessonMark['kind'],
  ) =>
    Object.entries(record).flatMap(([week, done]) =>
      (done ?? []).map((ref) => ({ week: Number(week), kind, ref: String(ref) })),
    )
  return [
    ...progress.heardWeeks.map((week) => ({ week, kind: 'heard' as const, ref: '' })),
    ...byWeek(progress.doneDays, 'day'),
    ...byWeek(progress.reviewParts, 'review_part'),
    ...byWeek(progress.scenariosDone, 'scenario'),
  ]
}

const nameOf = ({ week, kind, ref }: LessonMark) => `${week}:${kind}:${ref}`

// The marks the account is known to hold: what is done here and not among them is still to send.
// Kept for as long as the page is open; the account says again what it holds at each start.
let held = new Set<string>()

/**
 * Lesson progress. It is only ever added to, so there is nothing to decide between a phone and
 * the account: what either says was done, was done. The phone takes what the account has, and
 * sends what the account lacks.
 */
registerLearnerPart({
  name: 'progress',

  settle(account) {
    const theirs = readLessonProgress(account.progress)
    held = new Set(marksOf(theirs).map(nameOf))
    const { heardWeeks, doneDays, reviewParts, scenariosDone } = useLessonProgressStore.getState()
    const ours = { heardWeeks, doneDays, reviewParts, scenariosDone }
    const both = joinLessonProgress(ours, theirs)
    // Left alone when the account adds nothing, so that screens reading it do not render again.
    if (marksOf(both).length !== marksOf(ours).length) useLessonProgressStore.setState(both)
  },

  async send() {
    const missing = marksOf(useLessonProgressStore.getState()).filter(
      (mark) => !held.has(nameOf(mark)),
    )
    for (let from = 0; from < missing.length; from += LESSON_MARKS_MAX) {
      const some = missing.slice(from, from + LESSON_MARKS_MAX)
      await addMarks(some)
      for (const mark of some) held.add(nameOf(mark))
    }
  },

  watch: (changed) => useLessonProgressStore.subscribe(changed),

  clear() {
    held = new Set()
    useLessonProgressStore.setState(NO_LESSON_PROGRESS)
  },
})
