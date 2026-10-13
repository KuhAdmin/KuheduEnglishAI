import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isSafeAssetUrl } from '../appConfig/fields'

/**
 * The photo a learner chose for their profile: shrunk in the browser and kept here as a
 * `data:` URL. For someone signed in it is saved with their account too, and so follows them
 * to another phone (`shared/lib/learnerData/photoPart.ts`); it is shown to nobody else.
 */

/** A photo as it may be kept and shown: one of ours, re-encoded as a raster image. */
export const isStoredPhoto = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('data:image/') && isSafeAssetUrl(value)

type ProfilePhotoState = {
  /** `null` until the learner chooses one (Profile), and again once they remove it. */
  photo: string | null
  setPhoto: (photo: string) => void
  removePhoto: () => void
}

export const useProfilePhotoStore = create<ProfilePhotoState>()(
  persist(
    (set) => ({
      photo: null,
      setPhoto: (photo) => set({ photo }),
      removePhoto: () => set({ photo: null }),
    }),
    {
      name: 'kuhedu-profile-photo',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ photo }) => ({ photo }),
      // What is read back from storage is shown as a picture, so it must still be one of ours.
      merge: (persisted, current) => {
        const saved = (persisted as { photo?: unknown } | undefined)?.photo
        return { ...current, photo: isStoredPhoto(saved) ? saved : null }
      },
    },
  ),
)
