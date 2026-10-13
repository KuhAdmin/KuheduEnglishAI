import { useState } from 'react'
import { useSessionStore } from '@/shared/lib/account'
import type { TranslationKey } from '@/shared/lib/i18n'
import { fileToStoredImage, ImageUnreadableError } from '@/shared/lib/image/imageUpload'
import { isStoredPhoto, useProfilePhotoStore } from '@/shared/lib/learner/profilePhoto'

/** Plenty for a picture shown some 80px across, on the sharpest screens, in a few dozen KB. */
const PHOTO_BOUNDS = { maxWidth: 512, maxHeight: 512 }

type Status = 'idle' | 'working' | 'unreadable' | 'notKept'

const problems = {
  unreadable: 'profile.photo.unreadable',
  notKept: 'profile.photo.notKept',
} satisfies Partial<Record<Status, TranslationKey>>

/**
 * The learner's picture in Profile, and changing it. Their own photo, chosen here and kept in
 * this browser, comes first; else the picture of the Google account they signed in with; else
 * none, and the screen draws its stand-in.
 */
export function useProfilePhoto() {
  const own = useProfilePhotoStore((state) => state.photo)
  const setPhoto = useProfilePhotoStore((state) => state.setPhoto)
  const removePhoto = useProfilePhotoStore((state) => state.removePhoto)
  const fromGoogle = useSessionStore((state) => state.user?.pictureUrl ?? null)
  const [status, setStatus] = useState<Status>('idle')

  const choose = async (file: File) => {
    setStatus('working')
    try {
      const photo = await fileToStoredImage(file, PHOTO_BOUNDS)
      if (!isStoredPhoto(photo)) throw new Error('Not a photo that can be kept')
      // Storage that is full refuses here.
      setPhoto(photo)
      setStatus('idle')
    } catch (error) {
      setStatus(error instanceof ImageUnreadableError ? 'unreadable' : 'notKept')
    }
  }

  return {
    // The server's word is checked like anything else it sends: only an `https` address is shown.
    src: own ?? (fromGoogle?.startsWith('https://') ? fromGoogle : null),
    /** The picture on show is the learner's own photo, which they can remove. */
    isOwn: own !== null,
    busy: status === 'working',
    /** The text that says why the last photo was not taken, if it was not. */
    problem: status === 'unreadable' || status === 'notKept' ? problems[status] : null,
    choose,
    remove: () => {
      removePhoto()
      setStatus('idle')
    },
  }
}
