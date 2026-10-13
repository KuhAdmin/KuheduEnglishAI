import { isStoredPhoto, useProfilePhotoStore } from '../learner/profilePhoto'
import { fetchPhoto, isRefusedForGood, removePhoto, savePhoto } from './api'
import { registerLearnerPart } from './parts'
import { syncRecord } from './syncRecord'

const PHOTO = 'photo'

// While the account's photo is being put into the store, the store changes, and that change is
// not the learner's: it must not be sent back as theirs.
let applying = false

function keepHere(photo: string | null, stamp: string | null) {
  applying = true
  try {
    useProfilePhotoStore.setState({ photo })
  } finally {
    applying = false
  }
  syncRecord.setPhotoStamp(stamp)
}

/**
 * The learner's own photo. It is heavy beside everything else kept of them, so the account says
 * only when it was last saved, and the picture is fetched by a browser whose copy is not that
 * one. A photo chosen or removed here and not sent yet is ours to send.
 */
registerLearnerPart({
  name: PHOTO,

  async settle(account, { adopting }) {
    if (syncRecord.isUnsent(PHOTO)) return
    const saved = account.profile.photoUpdatedAt
    const here = useProfilePhotoStore.getState().photo
    if (saved === null) {
      // What was nobody's fills what the account lacks: it is sent, not wiped.
      if (adopting && here !== null) syncRecord.markUnsent(PHOTO)
      else if (here !== null || syncRecord.photoStamp() !== null) keepHere(null, null)
      return
    }
    if (saved === syncRecord.photoStamp() && here !== null) return
    const { photo } = await fetchPhoto()
    // What is read back is shown as a picture, so it must still be one of ours.
    if (isStoredPhoto(photo)) keepHere(photo, saved)
  },

  async send() {
    if (!syncRecord.isUnsent(PHOTO)) return
    const photo = useProfilePhotoStore.getState().photo
    try {
      if (photo === null) {
        await removePhoto()
        syncRecord.setPhotoStamp(null)
      } else {
        syncRecord.setPhotoStamp((await savePhoto(photo)).photoUpdatedAt)
      }
    } catch (error) {
      // A picture the server will not keep (too heavy for it) stays on this phone only.
      if (!isRefusedForGood(error)) throw error
    }
    // Changed again while it was on its way: that change is still to be sent.
    if (useProfilePhotoStore.getState().photo === photo) syncRecord.markSent(PHOTO)
  },

  watch: (changed) =>
    useProfilePhotoStore.subscribe((state, previous) => {
      if (applying || state.photo === previous.photo) return
      syncRecord.markUnsent(PHOTO)
      changed()
    }),

  clear() {
    keepHere(null, null)
  },
})
