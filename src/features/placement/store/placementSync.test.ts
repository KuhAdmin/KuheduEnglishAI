import type { LearnerData, SessionUser } from '@kuhedu/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Api from '@/shared/lib/learnerData/api'
import { useSessionStore } from '@/shared/lib/account'
import { ApiError } from '@/shared/lib/api/client'
import { fetchLearnerData, savePlacement } from '@/shared/lib/learnerData/api'
import {
  learnerDataSent,
  learnerDataSettled,
  startLearnerSync,
  stopLearnerSync,
} from '@/shared/lib/learnerData/learnerSync'
import { syncRecord } from '@/shared/lib/learnerData/syncRecord'
import { ASSESSMENT_VERSION } from '../data/itemBank'
import type { PlacementResult, PlacementSession } from '../lib/sessionSchema'
import './placementSync'
import { usePlacementStore } from './usePlacementStore'

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

/** A test under way, on the questions this build has. */
const test = (id: string, updatedAt: string, changes: Partial<PlacementSession> = {}) =>
  ({
    id,
    version: ASSESSMENT_VERSION,
    status: 'IN_PROGRESS',
    startedAt: '2026-10-13T08:00:00.000Z',
    updatedAt,
    completedAt: null,
    languageSupport: 'bn',
    deviceType: 'mobile',
    stage: 'LISTEN',
    stageStarted: true,
    currentItemId: 'L-F-1',
    responses: [],
    notAssessed: {},
    ...changes,
  }) satisfies PlacementSession

const outcome = (sessionId: string, completedAt: string): PlacementResult => ({
  sessionId,
  version: ASSESSMENT_VERSION,
  completedAt,
  profile: {
    listening: { status: 'assessed', level: 'A2', confidence: 'medium' },
    understanding: { status: 'assessed', level: 'A1', confidence: 'high' },
    speaking: { status: 'notAssessed', reason: 'notScoredYet' },
    understandBreakdown: {
      vocabulary: { correct: 1, attempted: 2 },
      meaning: { correct: 1, attempted: 1 },
      grammar: { correct: 0, attempted: 1 },
      functional: { correct: 1, attempted: 1 },
    },
    dependency: { translation: null, replay: 0.25, help: 0 },
    speakingAttempts: 2,
  },
  recommendation: {
    startLevel: 'A1',
    supportLevel: 'MEDIUM',
    prioritySkills: ['speaking'],
    provisional: true,
  },
})

const finished = (id: string, at: string) =>
  test(id, at, { status: 'COMPLETED', stage: 'SPEAK', currentItemId: null, completedAt: at })

/** What the account holds of the test; nothing unless the test says. */
const holds = (placement: Partial<LearnerData['placement']> = {}) =>
  vi.mocked(fetchLearnerData).mockResolvedValue({
    profile: {
      language: null,
      ageGroup: null,
      tutorAvatar: null,
      theme: null,
      voices: {},
      photoUpdatedAt: null,
    },
    progress: { heardWeeks: [], doneDays: {}, reviewParts: {}, scenariosDone: {} },
    placement: { session: null, result: null, ...placement },
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
  usePlacementStore.setState({ session: null, result: null, events: [] })
  vi.mocked(fetchLearnerData).mockReset()
  vi.mocked(savePlacement).mockReset().mockResolvedValue(null)
  holds()
})

describe('the placement test, kept with the account', () => {
  it('is taken from the account by a browser that holds none: a test begun elsewhere goes on here', async () => {
    const theirs = test('PL-A', '2026-10-13T08:05:00.000Z')
    holds({ session: theirs })

    await signIn()

    expect(usePlacementStore.getState().session).toEqual(theirs)
    // It is the account's already.
    expect(savePlacement).not.toHaveBeenCalled()
  })

  it('brings a level with it: the outcome of the test last finished', async () => {
    const done = finished('PL-A', '2026-10-13T08:10:00.000Z')
    holds({ session: done, result: outcome('PL-A', '2026-10-13T08:10:00.000Z') })

    await signIn()

    expect(usePlacementStore.getState().result?.recommendation.startLevel).toBe('A1')
    expect(usePlacementStore.getState().session?.status).toBe('COMPLETED')
  })

  it('lets the test touched later stand, whichever side has it', async () => {
    const ours = test('PL-B', '2026-10-13T09:00:00.000Z')
    usePlacementStore.setState({ session: ours })
    holds({ session: test('PL-A', '2026-10-13T08:05:00.000Z') })

    await signIn()

    expect(usePlacementStore.getState().session).toEqual(ours)
    expect(savePlacement).toHaveBeenCalledExactlyOnceWith({ session: ours, result: null })
  })

  it('does not go on with a test begun on questions this build no longer has', async () => {
    holds({ session: test('PL-A', '2026-10-13T08:05:00.000Z', { version: 'an-older-bank' }) })

    await signIn()

    expect(usePlacementStore.getState().session).toBeNull()
  })

  it('is sent as it changes, and with its result once it is finished', async () => {
    await signIn()

    const begun = test('PL-A', '2026-10-13T08:01:00.000Z')
    usePlacementStore.setState({ session: begun })
    await learnerDataSent()
    expect(savePlacement).toHaveBeenLastCalledWith({ session: begun, result: null })

    const done = finished('PL-A', '2026-10-13T08:10:00.000Z')
    const result = outcome('PL-A', '2026-10-13T08:10:00.000Z')
    usePlacementStore.setState({ session: done, result })
    await learnerDataSent()
    expect(savePlacement).toHaveBeenLastCalledWith({ session: done, result })
    expect(savePlacement).toHaveBeenCalledTimes(2)

    // Nothing is sent again for what the account already has.
    await learnerDataSent()
    expect(savePlacement).toHaveBeenCalledTimes(2)
  })

  it('does not go on sending a test the account already holds as finished', async () => {
    await signIn()
    vi.mocked(savePlacement).mockRejectedValue(
      new ApiError(409, 'finished', { error: { code: 'conflict', message: 'no' } }),
    )

    usePlacementStore.setState({ session: test('PL-A', '2026-10-13T08:01:00.000Z') })
    await learnerDataSent()
    await learnerDataSent()

    expect(savePlacement).toHaveBeenCalledOnce()
  })

  it('goes from the browser, events and all, when nobody is signed in any more', async () => {
    holds({ session: test('PL-A', '2026-10-13T08:05:00.000Z') })
    await signIn()
    usePlacementStore.setState({
      events: [
        {
          event: 'placement_started',
          sessionId: 'PL-A',
          itemId: null,
          stage: null,
          timestamp: '2026-10-13T08:00:00.000Z',
        },
      ],
    })

    useSessionStore.getState().setUser(null)

    expect(usePlacementStore.getState()).toMatchObject({ session: null, result: null, events: [] })
  })
})
