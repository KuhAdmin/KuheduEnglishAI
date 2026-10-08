import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isWeekNumber } from '@/shared/lib/curriculum/curriculum'

type LessonRecord = {
  /** Weeks whose opening conversation the learner has heard through once. */
  heardWeeks: number[]
}

type LessonState = LessonRecord & {
  markHeard: (week: number) => void
}

/**
 * What the learner has done in the lessons — so far only this, so that coming back to a
 * conversation already heard does not lock "Next" again.
 * TODO(lessons): real progress (steps and days completed), synced to an account (TODO(auth)).
 */
export const useLessonStore = create<LessonState>()(
  persist(
    (set) => ({
      heardWeeks: [],
      markHeard: (week) =>
        set(({ heardWeeks }) =>
          heardWeeks.includes(week) ? { heardWeeks } : { heardWeeks: [...heardWeeks, week] },
        ),
    }),
    {
      name: 'kuhedu-lessons',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ heardWeeks }): LessonRecord => ({ heardWeeks }),
      // Saved by this browser at some earlier time; keep only what is still a week.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Record<keyof LessonRecord, unknown>>
        const heardWeeks = Array.isArray(saved.heardWeeks)
          ? [...new Set(saved.heardWeeks.filter(isWeekNumber))]
          : []
        return { ...current, heardWeeks }
      },
    },
  ),
)
