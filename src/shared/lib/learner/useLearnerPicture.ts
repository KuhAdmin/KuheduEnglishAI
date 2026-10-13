import { useSessionStore } from '@/shared/lib/account'
import { useProfilePhotoStore } from './profilePhoto'

/**
 * The learner's own picture, where they have one: the photo they chose in Profile, kept in this
 * browser; else the picture of the Google account they signed in with. `null` for neither, and
 * whoever shows it draws a stand-in. A still picture, for wherever the learner is shown as
 * themselves (Profile, their side of a conversation).
 */
export function useLearnerPicture(): string | null {
  const own = useProfilePhotoStore((state) => state.photo)
  const fromGoogle = useSessionStore((state) => state.user?.pictureUrl ?? null)
  // The server's word is checked like anything else it sends: only an `https` address is shown.
  return own ?? (fromGoogle?.startsWith('https://') ? fromGoogle : null)
}
