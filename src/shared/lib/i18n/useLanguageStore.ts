import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type LanguageState = {
  /**
   * BCP-47 code of the language the learner chose during onboarding: the app is shown in it
   * and explanations are given in it. `null` until they choose.
   */
  language: string | null
  setLanguage: (language: string) => void
}

// TODO(auth): sync to the learner's account once sign-in exists.
export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: null,
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'kuhedu-language',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ language }) => ({ language }),
      merge: (persisted, current) => {
        const saved = (persisted as { language?: unknown } | undefined)?.language
        return { ...current, language: typeof saved === 'string' ? saved : null }
      },
    },
  ),
)
