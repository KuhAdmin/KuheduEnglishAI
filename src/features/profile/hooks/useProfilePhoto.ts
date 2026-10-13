import { useState } from 'react'
import type { TranslationKey } from '@/shared/lib/i18n'
import { fileToStoredImage, ImageUnreadableError } from '@/shared/lib/image/imageUpload'
import { isStoredPhoto, useProfilePhotoStore } from '@/shared/lib/learner/profilePhoto'
import { useLearnerPicture } from '@/shared/lib/learner/useLearnerPicture'

/** Plenty for a picture shown some 80px across, on the sharpest screens, in a few dozen KB. */
const PHOTO_BOUNDS = { maxWidth: 512, maxHeight: 512 }

type Status = 'idle' | 'working' | 'unreadable' | 'notKept'

const problems = {
  unreadable: 'profile.photo.unreadable',
  notKept: 'profile.photo.notKept',
} satisfies Partial<Record<Status, TranslationKey>>

/**
 * The learner's picture in Profile, and changing it. Which picture is theirs is
 * `useLearnerPicture`'s to say (their own photo, else their Google account's, else none, and the
 * screen draws its stand-in); this adds choosing a photo and taking it away.
 */
export function useProfilePhoto() {
  const own = useProfilePhotoStore((state) => state.photo)
  const setPhoto = useProfilePhotoStore((state) => state.setPhoto)
  const removePhoto = useProfilePhotoStore((state) => state.removePhoto)
  const src = useLearnerPicture()
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
    src,
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
