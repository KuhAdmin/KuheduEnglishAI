import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { TranslationKey } from '@/shared/lib/i18n'

/**
 * The faces a learner can give their tutor. Fixed in code, because each is a drawing of ours
 * (`TutorAvatar` in shared/ui draws the one asked for), not a picture an admin uploads.
 */
export const tutorAvatars = [
  { id: 'male', labelKey: 'tutor.male', voice: 'male' },
  { id: 'female', labelKey: 'tutor.female', voice: 'female' },
] as const satisfies readonly {
  id: string
  labelKey: TranslationKey
  /** The kind of voice that suits the face (`voiceForFace` finds one on the device). */
  voice: 'male' | 'female'
}[]

export type TutorAvatarId = (typeof tutorAvatars)[number]['id']

/** The tutor's face until the learner chooses one. */
export const DEFAULT_TUTOR_AVATAR: TutorAvatarId = 'male'

export function isTutorAvatarId(value: unknown): value is TutorAvatarId {
  return tutorAvatars.some((avatar) => avatar.id === value)
}

type TutorAvatarState = {
  /** `null` until the learner chooses (Profile › Tutor avatar). */
  avatar: TutorAvatarId | null
  setAvatar: (avatar: TutorAvatarId) => void
}

// TODO(auth): sync to the learner's account once sign-in exists.
export const useTutorAvatarStore = create<TutorAvatarState>()(
  persist(
    (set) => ({
      avatar: null,
      setAvatar: (avatar) => set({ avatar }),
    }),
    {
      name: 'kuhedu-tutor-avatar',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ avatar }) => ({ avatar }),
      // A saved face may be one a later build no longer draws.
      merge: (persisted, current) => {
        const saved = (persisted as { avatar?: unknown } | undefined)?.avatar
        return { ...current, avatar: isTutorAvatarId(saved) ? saved : null }
      },
    },
  ),
)

/** The face the learner's tutor has: their choice, or the default until they make one. */
export const useTutorAvatar = (): TutorAvatarId =>
  useTutorAvatarStore((state) => state.avatar) ?? DEFAULT_TUTOR_AVATAR

const voiceKindOf = (avatar: TutorAvatarId | null) =>
  tutorAvatars.find(({ id }) => id === (avatar ?? DEFAULT_TUTOR_AVATAR))?.voice ?? 'male'

/** The kind of voice the learner's tutor speaks with: a man's for the male face, and so on. */
export const useTutorVoiceKind = () => useTutorAvatarStore((state) => voiceKindOf(state.avatar))

/** The same, for code outside React (`speech.ts`). */
export const tutorVoiceKind = () => voiceKindOf(useTutorAvatarStore.getState().avatar)
