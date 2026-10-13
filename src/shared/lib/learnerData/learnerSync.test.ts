import type { LearnerData, SessionUser } from '@kuhedu/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Client from '../api/client'
import type * as Api from './api'
import { useThemeStore } from '@/shared/theme/useThemeStore'
import { signOut } from '../account/session'
import { useSessionStore } from '../account/useSessionStore'
import { ApiError, apiRequest } from '../api/client'
import { useVoiceStore } from '../audio/useVoiceStore'
import { useLanguageStore } from '../i18n/useLanguageStore'
import { NO_LESSON_PROGRESS, useLessonProgressStore } from '../learner/lessonProgress'
import { useProfilePhotoStore } from '../learner/profilePhoto'
import { useTutorAvatarStore } from '../learner/tutorAvatar'
import { addMarks, fetchLearnerData, fetchPhoto, removePhoto, saveProfile, savePhoto } from './api'
import {
  learnerDataSent,
  learnerDataSettled,
  startLearnerSync,
  stopLearnerSync,
} from './learnerSync'
import { syncRecord } from './syncRecord'

// No server here: what it would be asked, and what it would answer, is the test's to say.
vi.mock('./api', async (original) => ({
  ...(await original<typeof Api>()),
  fetchLearnerData: vi.fn(),
  saveProfile: vi.fn(),
  fetchPhoto: vi.fn(),
  savePhoto: vi.fn(),
  removePhoto: vi.fn(),
  addMarks: vi.fn(),
  savePlacement: vi.fn(),
}))
vi.mock('../api/client', async (original) => ({
  ...(await original<typeof Client>()),
  apiRequest: vi.fn(),
}))

const asha: SessionUser = {
  id: 'asha',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}
const ravi: SessionUser = { ...asha, id: 'ravi', email: 'ravi@example.com' }

const PHOTO = 'data:image/webp;base64,AAAA'
const OTHER_PHOTO = 'data:image/webp;base64,BBBB'

/** What an account holds; nothing at all unless the test says. */
const account = (held: {
  profile?: Partial<LearnerData['profile']>
  progress?: Partial<LearnerData['progress']>
}): LearnerData => ({
  profile: {
    language: null,
    ageGroup: null,
    tutorAvatar: null,
    theme: null,
    voices: {},
    photoUpdatedAt: null,
    ...held.profile,
  },
  progress: { heardWeeks: [], doneDays: {}, reviewParts: {}, scenariosDone: {}, ...held.progress },
  placement: { session: null, result: null },
})

const holds = (held: Parameters<typeof account>[0] = {}) =>
  vi.mocked(fetchLearnerData).mockResolvedValue(account(held))

/** The server says who is signed in: someone, or nobody. */
const serverSays = (user: SessionUser | null) => useSessionStore.getState().setUser(user)

/** A page opened afresh: what the browser stored is still there, nothing else is. */
function reopen() {
  stopLearnerSync()
  useSessionStore.setState({ user: null, loaded: false })
  syncRecord.reload()
  startLearnerSync()
}

const settled = () => learnerDataSettled(1000)
const progress = () => {
  const { heardWeeks, doneDays, reviewParts, scenariosDone } = useLessonProgressStore.getState()
  return { heardWeeks, doneDays, reviewParts, scenariosDone }
}

beforeEach(() => {
  stopLearnerSync()
  localStorage.clear()
  syncRecord.reload()
  useSessionStore.setState({ user: null, loaded: false })
  useLanguageStore.setState({ language: null })
  useThemeStore.setState({ preference: 'auto' })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  useProfilePhotoStore.setState({ photo: null })
  useLessonProgressStore.setState(NO_LESSON_PROGRESS)
  vi.mocked(fetchLearnerData).mockReset()
  vi.mocked(saveProfile).mockReset().mockResolvedValue(account({}).profile)
  vi.mocked(fetchPhoto).mockReset().mockResolvedValue({ photo: PHOTO })
  vi.mocked(savePhoto).mockReset().mockResolvedValue({ photoUpdatedAt: '2026-10-13T10:00:00.000Z' })
  vi.mocked(removePhoto).mockReset().mockResolvedValue(null)
  vi.mocked(addMarks).mockReset().mockResolvedValue(null)
  vi.mocked(apiRequest).mockReset().mockResolvedValue(null)
  holds()
})

describe('before it is started', () => {
  it('leaves the stores to the browser, whoever signs in', async () => {
    useLanguageStore.setState({ language: 'bn' })

    serverSays(asha)
    await settled()

    expect(fetchLearnerData).not.toHaveBeenCalled()
    expect(useLanguageStore.getState().language).toBe('bn')
  })
})

describe('a browser that is nobody’s yet, when a learner signs in', () => {
  it('gives the account what it lacks, and becomes the account’s', async () => {
    useLanguageStore.setState({ language: 'bn' })
    useTutorAvatarStore.setState({ avatar: 'female' })
    useLessonProgressStore.setState({ heardWeeks: [1], doneDays: { 1: [1, 2] } })
    startLearnerSync()

    serverSays(asha)
    await settled()

    // Only what was chosen here: the look and the voices were never set.
    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ language: 'bn', tutorAvatar: 'female' })
    expect(addMarks).toHaveBeenCalledExactlyOnceWith([
      { week: 1, kind: 'heard', ref: '' },
      { week: 1, kind: 'day', ref: '1' },
      { week: 1, kind: 'day', ref: '2' },
    ])
    expect(syncRecord.ofAccount()).toBe(true)
    // Whose it is, is never stored.
    expect(JSON.stringify({ ...localStorage })).not.toContain('asha')
  })

  it('takes the account’s answer where the account has one, over what was chosen here', async () => {
    useLanguageStore.setState({ language: 'bn' })
    holds({
      profile: {
        language: 'hi',
        theme: 'sage-dusk',
        tutorAvatar: 'female',
        voices: { en: { female: 'af_bella' } },
      },
      progress: { heardWeeks: [2], doneDays: { 2: [1] } },
    })
    startLearnerSync()

    serverSays(asha)
    await settled()

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(useThemeStore.getState().preference).toBe('sage-dusk')
    expect(useTutorAvatarStore.getState().avatar).toBe('female')
    expect(useVoiceStore.getState().voices).toEqual({ en: { female: 'af_bella' } })
    expect(progress()).toMatchObject({ heardWeeks: [2], doneDays: { 2: [1] } })
    expect(saveProfile).not.toHaveBeenCalled()
    expect(addMarks).not.toHaveBeenCalled()
  })

  it('does not send a voice the server never had, from when the device’s own were used', async () => {
    useVoiceStore.setState({
      voices: { en: { female: 'Google UK English Female', male: 'am_adam' }, hi: { male: 'x' } },
    })
    startLearnerSync()

    serverSays(asha)
    await settled()

    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ voices: { en: { male: 'am_adam' } } })
  })

  it('keeps nothing for a sign-up whose code is not entered, and leaves the visitor’s choice', async () => {
    useLanguageStore.setState({ language: 'bn' })
    startLearnerSync()

    serverSays({ ...asha, emailVerified: false })
    await settled()

    expect(fetchLearnerData).not.toHaveBeenCalled()
    expect(useLanguageStore.getState().language).toBe('bn')
    expect(syncRecord.ofAccount()).toBe(false)
  })

  it('leaves a visitor’s choice alone while nobody is signed in', async () => {
    useLanguageStore.setState({ language: 'bn' })
    startLearnerSync()

    serverSays(null)
    await settled()

    expect(useLanguageStore.getState().language).toBe('bn')
    expect(fetchLearnerData).not.toHaveBeenCalled()
  })
})

describe('a browser that holds an account’s data', () => {
  /** Asha has used this browser: what is in it is her account’s. */
  async function ashasBrowser(held: Parameters<typeof account>[0] = {}) {
    holds(held)
    startLearnerSync()
    serverSays(asha)
    await settled()
    vi.mocked(saveProfile).mockClear()
    vi.mocked(addMarks).mockClear()
  }

  it('takes the account’s word on a later visit: changed elsewhere, it changes here', async () => {
    await ashasBrowser({ profile: { language: 'bn', theme: 'sage-dusk' } })

    // On another phone she chose Hindi and went back to the look that follows the device.
    holds({ profile: { language: 'hi', theme: null }, progress: { doneDays: { 3: [1] } } })
    reopen()
    serverSays(asha)
    await settled()

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(useThemeStore.getState().preference).toBe('auto')
    expect(progress().doneDays).toEqual({ 3: [1] })
    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('sends a change as it is made', async () => {
    await ashasBrowser()

    useThemeStore.getState().setPreference('midnight-iris')
    useLessonProgressStore.getState().markDayDone(1, 1)
    await learnerDataSent()

    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ theme: 'midnight-iris' })
    expect(addMarks).toHaveBeenCalledExactlyOnceWith([{ week: 1, kind: 'day', ref: '1' }])

    // Sent once: nothing is sent again for what the account already has.
    await learnerDataSent()
    expect(saveProfile).toHaveBeenCalledOnce()
    expect(addMarks).toHaveBeenCalledOnce()
  })

  it('keeps a change it could not send, and sends it before taking the account’s word', async () => {
    await ashasBrowser({ profile: { language: 'bn' } })
    vi.mocked(saveProfile).mockRejectedValue(new TypeError('Failed to fetch'))
    vi.mocked(addMarks).mockRejectedValue(new TypeError('Failed to fetch'))

    useLanguageStore.getState().setLanguage('hi')
    useLessonProgressStore.getState().markHeard(4)
    await learnerDataSent()

    // The page is closed and opened again, with the server back; it still says Bengali.
    vi.mocked(saveProfile).mockReset().mockResolvedValue(account({}).profile)
    vi.mocked(addMarks).mockReset().mockResolvedValue(null)
    reopen()
    serverSays(asha)
    await settled()

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ language: 'hi' })
    expect(addMarks).toHaveBeenCalledExactlyOnceWith([{ week: 4, kind: 'heard', ref: '' }])
  })

  it('remembers a change made while the server could not say who is signed in', async () => {
    await ashasBrowser({ profile: { language: 'bn' } })

    // Opened offline: nobody has been said to be signed in, and the app runs on what is here.
    reopen()
    useLanguageStore.getState().setLanguage('hi')
    expect(saveProfile).not.toHaveBeenCalled()

    serverSays(asha)
    await settled()

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ language: 'hi' })
  })

  it('does not go on sending what the server will not keep', async () => {
    await ashasBrowser()
    vi.mocked(saveProfile).mockRejectedValue(
      new ApiError(400, 'refused', { error: { code: 'validation_failed', message: 'no' } }),
    )

    useLanguageStore.getState().setLanguage('bn')
    await learnerDataSent()
    await learnerDataSent()

    expect(saveProfile).toHaveBeenCalledOnce()
    // It stays as the learner set it, in this browser.
    expect(useLanguageStore.getState().language).toBe('bn')
  })

  it('is cleared when the server says nobody is signed in, so the next person starts from their own', async () => {
    await ashasBrowser({
      profile: {
        language: 'bn',
        theme: 'sage-dusk',
        tutorAvatar: 'female',
        voices: { en: { female: 'af_bella' } },
        photoUpdatedAt: '2026-10-01T00:00:00.000Z',
      },
      progress: { heardWeeks: [1], doneDays: { 1: [1, 2, 3] }, reviewParts: { 1: ['quiz'] } },
    })
    expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)

    serverSays(null)

    expect(useLanguageStore.getState().language).toBeNull()
    expect(useThemeStore.getState().preference).toBe('auto')
    expect(useTutorAvatarStore.getState().avatar).toBeNull()
    expect(useVoiceStore.getState().voices).toEqual({})
    expect(useProfilePhotoStore.getState().photo).toBeNull()
    expect(progress()).toEqual(NO_LESSON_PROGRESS)
    expect(syncRecord.ofAccount()).toBe(false)

    // Ravi signs in on the same phone: nothing of Asha's is given to his account.
    holds({ profile: { language: 'hi' } })
    serverSays(ravi)
    await settled()

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(saveProfile).not.toHaveBeenCalled()
    expect(addMarks).not.toHaveBeenCalled()
    expect(savePhoto).not.toHaveBeenCalled()
  })

  it('is cleared too when a session ran out while the page was closed', async () => {
    await ashasBrowser({ profile: { language: 'bn' }, progress: { heardWeeks: [1] } })

    reopen()
    serverSays(null)

    expect(useLanguageStore.getState().language).toBeNull()
    expect(progress()).toEqual(NO_LESSON_PROGRESS)
  })

  it('is not given to another account that takes the browser over with no sign-out between', async () => {
    await ashasBrowser({ profile: { language: 'bn' }, progress: { doneDays: { 1: [1] } } })

    holds({ profile: { tutorAvatar: 'female' } })
    serverSays(ravi)
    await settled()

    expect(useLanguageStore.getState().language).toBeNull()
    expect(useTutorAvatarStore.getState().avatar).toBe('female')
    expect(progress()).toEqual(NO_LESSON_PROGRESS)
    expect(saveProfile).not.toHaveBeenCalled()
    expect(addMarks).not.toHaveBeenCalled()
  })

  it('sends what is unsent before the browser is signed out', async () => {
    await ashasBrowser()
    const order: string[] = []
    vi.mocked(saveProfile).mockImplementation(async () => {
      order.push('profile')
      return account({}).profile
    })
    vi.mocked(apiRequest).mockImplementation(async (path) => {
      order.push(path)
      return null
    })

    useLanguageStore.getState().setLanguage('hi')
    await signOut()

    expect(order).toEqual(['profile', '/auth/sign-out'])
    expect(useLanguageStore.getState().language).toBeNull()
  })
})

describe('the learner’s photo', () => {
  it('is fetched by a browser that does not hold it, and not again by one that does', async () => {
    holds({ profile: { photoUpdatedAt: '2026-10-01T00:00:00.000Z' } })
    startLearnerSync()
    serverSays(asha)
    await settled()

    expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)
    expect(fetchPhoto).toHaveBeenCalledOnce()
    // Putting it in the store is not the learner choosing it.
    expect(savePhoto).not.toHaveBeenCalled()

    reopen()
    serverSays(asha)
    await settled()
    expect(fetchPhoto).toHaveBeenCalledOnce()

    // Changed on another phone: the stamp is another one.
    vi.mocked(fetchPhoto).mockResolvedValue({ photo: OTHER_PHOTO })
    holds({ profile: { photoUpdatedAt: '2026-10-05T00:00:00.000Z' } })
    reopen()
    serverSays(asha)
    await settled()
    expect(useProfilePhotoStore.getState().photo).toBe(OTHER_PHOTO)
  })

  it('goes from here when the account no longer has one', async () => {
    holds({ profile: { photoUpdatedAt: '2026-10-01T00:00:00.000Z' } })
    startLearnerSync()
    serverSays(asha)
    await settled()

    holds()
    reopen()
    serverSays(asha)
    await settled()

    expect(useProfilePhotoStore.getState().photo).toBeNull()
    expect(removePhoto).not.toHaveBeenCalled()
  })

  it('is saved when chosen, and taken away when removed', async () => {
    startLearnerSync()
    serverSays(asha)
    await settled()

    useProfilePhotoStore.getState().setPhoto(PHOTO)
    await learnerDataSent()
    expect(savePhoto).toHaveBeenCalledExactlyOnceWith(PHOTO)

    useProfilePhotoStore.getState().removePhoto()
    await learnerDataSent()
    expect(removePhoto).toHaveBeenCalledOnce()
  })

  it('chosen before signing in is given to an account that has none', async () => {
    useProfilePhotoStore.setState({ photo: PHOTO })
    startLearnerSync()

    serverSays(asha)
    await settled()

    expect(savePhoto).toHaveBeenCalledExactlyOnceWith(PHOTO)
    expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)
  })

  it('stays on this phone when it is too heavy for the server, and is not sent again', async () => {
    startLearnerSync()
    serverSays(asha)
    await settled()
    vi.mocked(savePhoto).mockRejectedValue(
      new ApiError(413, 'too large', { error: { code: 'validation_failed', message: 'no' } }),
    )

    useProfilePhotoStore.getState().setPhoto(PHOTO)
    await learnerDataSent()
    await learnerDataSent()

    expect(savePhoto).toHaveBeenCalledOnce()
    expect(useProfilePhotoStore.getState().photo).toBe(PHOTO)
  })
})

describe('when the server cannot be asked', () => {
  it('leaves the stores as they are, and brings them together once it can', async () => {
    useLanguageStore.setState({ language: 'bn' })
    useLessonProgressStore.setState({ heardWeeks: [1] })
    vi.mocked(fetchLearnerData).mockRejectedValue(new TypeError('Failed to fetch'))
    startLearnerSync()

    serverSays(asha)
    await settled()

    expect(useLanguageStore.getState().language).toBe('bn')
    expect(progress().heardWeeks).toEqual([1])
    expect(syncRecord.ofAccount()).toBe(false)
    expect(saveProfile).not.toHaveBeenCalled()

    holds({ progress: { heardWeeks: [2] } })
    window.dispatchEvent(new Event('online'))
    await settled()

    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ language: 'bn' })
    expect(progress().heardWeeks).toEqual([1, 2])
    expect(syncRecord.ofAccount()).toBe(true)
  })

  it('does not hold a screen back for longer than it was told to wait', async () => {
    vi.mocked(fetchLearnerData).mockReturnValue(new Promise(() => {}))
    startLearnerSync()
    serverSays(asha)

    const started = performance.now()
    await learnerDataSettled(30)

    expect(performance.now() - started).toBeLessThan(500)
    expect(syncRecord.ofAccount()).toBe(false)
  })
})
