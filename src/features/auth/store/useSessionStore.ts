import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type SessionRole = 'admin'

type SessionState = {
  /** `null` when nobody is signed in. Learner accounts do not exist yet. */
  role: SessionRole | null
  signInAsAdmin: () => void
  signOut: () => void
}

// Browser-side session for the local admin (see lib/localAdmin). TODO(auth): real sessions.
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      role: null,
      signInAsAdmin: () => set({ role: 'admin' }),
      signOut: () => set({ role: null }),
    }),
    {
      name: 'kuhedu-session',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ role }) => ({ role }),
      merge: (persisted, current) => {
        const saved = (persisted as { role?: unknown } | undefined)?.role
        return { ...current, role: saved === 'admin' ? 'admin' : null }
      },
    },
  ),
)
