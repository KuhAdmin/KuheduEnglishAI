import {
  learnerDataSchema,
  learnerPhotoSavedSchema,
  learnerPhotoSchema,
  learnerProfileSchema,
  noContentSchema,
  type LearnerProfilePatch,
  type LessonMark,
  type PlacementSave,
} from '@kuhedu/contracts'
import { ApiError, apiRequest } from '../api/client'

/** Everything kept of the learner who is signed in, but their photo. */
export const fetchLearnerData = () => apiRequest('/me', { schema: learnerDataSchema })

export const saveProfile = (patch: LearnerProfilePatch) =>
  apiRequest('/me/profile', { method: 'PATCH', body: patch, schema: learnerProfileSchema })

export const fetchPhoto = () => apiRequest('/me/photo', { schema: learnerPhotoSchema })

export const savePhoto = (photo: string) =>
  apiRequest('/me/photo', { method: 'PUT', body: { photo }, schema: learnerPhotoSavedSchema })

export const removePhoto = () =>
  apiRequest('/me/photo', { method: 'DELETE', schema: noContentSchema })

export const addMarks = (marks: LessonMark[]) =>
  apiRequest('/me/progress/marks', { method: 'POST', body: { marks }, schema: noContentSchema })

export const savePlacement = (save: PlacementSave) =>
  apiRequest(`/me/placement/sessions/${encodeURIComponent(save.session.id)}`, {
    method: 'PUT',
    body: save,
    schema: noContentSchema,
  })

/**
 * Whether the server looked at what was sent and will not keep it, however often it is sent
 * again: it is not valid, or it is settled already (a finished test). Anything else (no
 * connection, no server, not signed in just now) is worth another try later.
 */
export const isRefusedForGood = (error: unknown): boolean =>
  error instanceof ApiError && (error.code === 'validation_failed' || error.code === 'conflict')
