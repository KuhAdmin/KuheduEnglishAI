import type { SettingsDraft } from '../hooks/useSettingsDraft'

type ByWeek<T> = Partial<Record<number, T>>

function withoutWeek<T>(content: ByWeek<T>, week: number): ByWeek<T> {
  return Object.fromEntries(Object.entries(content).filter(([other]) => Number(other) !== week))
}

/**
 * Editing one week's piece of lesson content (its conversation, its words) inside a settings
 * object that holds only the weeks an admin wrote: what is in force for the week, and how to
 * change it or drop the admin's version.
 */
export function weekContentEditor<T>({
  draft,
  week,
  builtIn,
  empty,
  isEmpty,
}: {
  draft: SettingsDraft<ByWeek<T>>
  week: number
  /** What ships with the app for this week, if anything. */
  builtIn: T | undefined
  /** What a week with nothing looks like. */
  empty: T
  isEmpty: (content: T) => boolean
}) {
  return {
    /** The admin's version, else the built-in one, else nothing. */
    value: draft.value[week] ?? builtIn ?? empty,
    /** The admin has written their own for this week. */
    written: draft.value[week] !== undefined,
    hasBuiltIn: builtIn !== undefined,

    set(next: T) {
      draft.update((current) => {
        // Back on the built-in content (or on nothing) is the same as not having written any.
        const unchanged = builtIn ? JSON.stringify(next) === JSON.stringify(builtIn) : isEmpty(next)
        return unchanged
          ? withoutWeek(current, week)
          : { ...withoutWeek(current, week), [week]: next }
      })
    },

    /** Drop the admin's version: the built-in content returns, or the week has none. */
    remove() {
      draft.update((current) => withoutWeek(current, week))
    },
  }
}

export type WeekContentEditor<T> = ReturnType<typeof weekContentEditor<T>>
