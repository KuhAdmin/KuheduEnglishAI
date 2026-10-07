import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isAgeGroupId, type AgeGroupId } from '@/shared/lib/learner/ageGroups'

type OnboardingAnswers = {
  /** Used to personalise examples and situations. */
  ageGroup: AgeGroupId | null
}

type OnboardingState = OnboardingAnswers & {
  setAgeGroup: (ageGroup: AgeGroupId) => void
}

// The learner's language is not here: the whole app needs it, so it lives in
// shared/lib/i18n/useLanguageStore.
// TODO(auth): sync these answers to the learner's account once sign-in exists.
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ageGroup: null,
      setAgeGroup: (ageGroup) => set({ ageGroup }),
    }),
    {
      name: 'kuhedu-onboarding',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ ageGroup }): OnboardingAnswers => ({ ageGroup }),
      // Saved answers may come from an older build; keep only what is still valid.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<Record<keyof OnboardingAnswers, unknown>>
        return { ...current, ageGroup: isAgeGroupId(saved.ageGroup) ? saved.ageGroup : null }
      },
    },
  ),
)
