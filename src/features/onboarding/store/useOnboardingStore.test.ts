import type { LearnerData, SessionUser } from '@kuhedu/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Api from '@/shared/lib/learnerData/api'
import { useSessionStore } from '@/shared/lib/account'
import { fetchLearnerData, saveProfile } from '@/shared/lib/learnerData/api'
import {
  learnerDataSent,
  learnerDataSettled,
  startLearnerSync,
  stopLearnerSync,
} from '@/shared/lib/learnerData/learnerSync'
import { syncRecord } from '@/shared/lib/learnerData/syncRecord'
import { useOnboardingStore } from './useOnboardingStore'

// No server here: what it would be asked, and what it would answer, is the test's to say.
vi.mock('@/shared/lib/learnerData/api', async (original) => ({
  ...(await original<typeof Api>()),
  fetchLearnerData: vi.fn(),
  saveProfile: vi.fn(),
  fetchPhoto: vi.fn(),
  savePhoto: vi.fn(),
  removePhoto: vi.fn(),
  addMarks: vi.fn(),
  savePlacement: vi.fn(),
}))

const asha: SessionUser = {
  id: 'asha',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

const profile: LearnerData['profile'] = {
  language: null,
  ageGroup: null,
  tutorAvatar: null,
  theme: null,
  voices: {},
  photoUpdatedAt: null,
}

const holds = (ageGroup: LearnerData['profile']['ageGroup']) =>
  vi.mocked(fetchLearnerData).mockResolvedValue({
    profile: { ...profile, ageGroup },
    progress: { heardWeeks: [], doneDays: {}, reviewParts: {}, scenariosDone: {} },
    placement: { session: null, result: null },
  })

async function signIn() {
  startLearnerSync()
  useSessionStore.getState().setUser(asha)
  await learnerDataSettled(1000)
}

beforeEach(() => {
  stopLearnerSync()
  localStorage.clear()
  syncRecord.reload()
  useSessionStore.setState({ user: null, loaded: false })
  useOnboardingStore.setState({ ageGroup: null })
  vi.mocked(fetchLearnerData).mockReset()
  vi.mocked(saveProfile).mockReset().mockResolvedValue(profile)
  holds(null)
})

describe('what a learner said about themselves, kept with the account', () => {
  it('comes with the account to a browser that was never told', async () => {
    holds('teen')

    await signIn()

    expect(useOnboardingStore.getState().ageGroup).toBe('teen')
    expect(saveProfile).not.toHaveBeenCalled()
  })

  it('is sent when it is answered', async () => {
    await signIn()

    useOnboardingStore.getState().setAgeGroup('adult')
    await learnerDataSent()

    expect(saveProfile).toHaveBeenCalledExactlyOnceWith({ ageGroup: 'adult' })
  })

  it('goes from the browser when nobody is signed in any more', async () => {
    holds('child')
    await signIn()

    useSessionStore.getState().setUser(null)

    expect(useOnboardingStore.getState().ageGroup).toBeNull()
  })
})
