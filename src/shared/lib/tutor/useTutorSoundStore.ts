import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type TutorSoundState = {
  /** The learner silenced the tutor: its lines are still written, never said by themselves. */
  muted: boolean
  setMuted: (muted: boolean) => void
}

// A matter of where the phone is being used, so it stays on the device like the voices do.
export const useTutorSoundStore = create<TutorSoundState>()(
  persist(
    (set) => ({
      muted: false,
      setMuted: (muted) => set({ muted }),
    }),
    {
      name: 'kuhedu-tutor-sound',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ muted }) => ({ muted }),
      // Anything but a saved `true` leaves the tutor speaking.
      merge: (persisted, current) => ({
        ...current,
        muted: (persisted as { muted?: unknown } | undefined)?.muted === true,
      }),
    },
  ),
)
