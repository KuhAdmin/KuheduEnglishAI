import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isAgeGroupId, type AgeGroupId } from '@/shared/lib/learner/ageGroups'
import { onValueChange, registerProfileField } from '@/shared/lib/learnerData/profileFields'

type OnboardingAnswers = {
  /** Used to personalise examples and situations. */
  ageGroup: AgeGroupId | null
}

type OnboardingState = OnboardingAnswers & {
  setAgeGroup: (ageGroup: AgeGroupId) => void
}

// The learner's language is not here: the whole app needs it, so it lives in
// shared/lib/i18n/useLanguageStore.
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

// Kept with the learner's account, like the answers the shared stores hold.
registerProfileField({
  key: 'ageGroup',
  read: () => useOnboardingStore.getState().ageGroup,
  apply: (value) => useOnboardingStore.setState({ ageGroup: isAgeGroupId(value) ? value : null }),
  subscribe: (changed) => onValueChange(useOnboardingStore, (state) => state.ageGroup, changed),
})
