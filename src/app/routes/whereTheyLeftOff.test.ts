import type { SessionUser } from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hasAnsweredAboutThemselves } from '@/features/onboarding'
import { placementProgress } from '@/features/placement'
import { SESSION_WAIT_MS, useSessionStore } from '@/shared/lib/account'
import { useLessonProgressStore } from '@/shared/lib/learner/lessonProgress'
import { paths } from '@/shared/lib/paths'
import { fakeServer, serverUnreachable } from '@/test/fakeServer'
import { leftOffAt, openWhereTheyLeftOff } from './whereTheyLeftOff'

// What onboarding and the placement test hold is theirs to say; here it is only given.
vi.mock('@/features/onboarding', () => ({ hasAnsweredAboutThemselves: vi.fn() }))
vi.mock('@/features/placement', () => ({ placementProgress: vi.fn() }))

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}
const admin: SessionUser = { ...learner, id: 'u-2', email: 'admin@example.com', role: 'admin' }

const nobody = { lessonsBegun: false, placement: 'none', aboutThemAnswered: false } as const

/** Where opening the app's front door leads: a path, or `null` for the landing page itself. */
async function opens(): Promise<string | null> {
  try {
    await openWhereTheyLeftOff()
    return null
  } catch (thrown) {
    if (thrown instanceof Response) return thrown.headers.get('Location')
    throw thrown
  }
}

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
  useLessonProgressStore.setState({
    heardWeeks: [],
    doneDays: {},
    reviewParts: {},
    scenariosDone: {},
  })
  vi.mocked(hasAnsweredAboutThemselves).mockReturnValue(false)
  vi.mocked(placementProgress).mockReturnValue('none')
  fakeServer({ 'GET /auth/session': { body: { user: null } } })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('leftOffAt', () => {
  it('has nowhere to send someone who has done nothing here', () => {
    expect(leftOffAt(nobody)).toBeNull()
  })

  it('goes on from the furthest thing they did', () => {
    expect(leftOffAt({ ...nobody, aboutThemAnswered: true })).toBe(paths.onboardingPlacement)
    expect(leftOffAt({ ...nobody, aboutThemAnswered: true, placement: 'started' })).toBe(
      paths.placementTest,
    )
    expect(leftOffAt({ ...nobody, aboutThemAnswered: true, placement: 'done' })).toBe(paths.home)
    // A lesson done counts for more than a test still under way.
    expect(leftOffAt({ ...nobody, placement: 'started', lessonsBegun: true })).toBe(paths.home)
  })

  it('takes a test or a lesson as a beginning even with onboarding’s answer missing', () => {
    expect(leftOffAt({ ...nobody, placement: 'started' })).toBe(paths.placementTest)
    expect(leftOffAt({ ...nobody, lessonsBegun: true })).toBe(paths.home)
  })
})

describe('openWhereTheyLeftOff', () => {
  const serverSays = (user: SessionUser | null) =>
    fakeServer({ 'GET /auth/session': { body: { user } } })

  it('shows the landing page to a first-time visitor', async () => {
    expect(await opens()).toBeNull()
  })

  it('shows it to someone who is not signed in, whatever this browser holds: there are no guests', async () => {
    vi.mocked(hasAnsweredAboutThemselves).mockReturnValue(true)
    vi.mocked(placementProgress).mockReturnValue('done')
    useLessonProgressStore.getState().markDayDone(1, 1)

    expect(await opens()).toBeNull()
  })

  it('sends a signed-in learner on from each place they can have stopped at', async () => {
    serverSays(learner)
    vi.mocked(hasAnsweredAboutThemselves).mockReturnValue(true)
    expect(await opens()).toBe(paths.onboardingPlacement)

    vi.mocked(placementProgress).mockReturnValue('started')
    expect(await opens()).toBe(paths.placementTest)

    vi.mocked(placementProgress).mockReturnValue('done')
    expect(await opens()).toBe(paths.home)
  })

  it('counts anything done in the lessons: a conversation heard, a day, a part, a scenario', async () => {
    serverSays(learner)
    useLessonProgressStore.getState().markHeard(1)
    expect(await opens()).toBe(paths.home)

    for (const begun of [
      { doneDays: { 3: [1] } },
      { reviewParts: { 1: ['quiz' as const] } },
      { scenariosDone: { 1: [0] } },
    ]) {
      useLessonProgressStore.setState({
        heardWeeks: [],
        doneDays: {},
        reviewParts: {},
        scenariosDone: {},
        ...begun,
      })
      expect(await opens()).toBe(paths.home)
    }
  })

  it('takes a signed-in learner with nothing of theirs on this phone into onboarding', async () => {
    serverSays(learner)
    expect(await opens()).toBe(paths.onboarding)
  })

  it('takes a learner who signed up and never entered their code to the code step: no account yet', async () => {
    serverSays({ ...learner, emailVerified: false })
    vi.mocked(placementProgress).mockReturnValue('done')

    expect(await opens()).toBe(paths.verifyEmail)
  })

  it('lets an admin see the landing page, which is theirs to edit', async () => {
    serverSays(admin)
    expect(await opens()).toBeNull()
  })

  it('sends an admin who has used the app as a learner here on like one', async () => {
    serverSays(admin)
    vi.mocked(placementProgress).mockReturnValue('done')

    expect(await opens()).toBe(paths.home)
  })

  it('shows the landing page when there is no server to say who is signed in', async () => {
    serverUnreachable()
    useLessonProgressStore.getState().markDayDone(1, 1)

    expect(await opens()).toBeNull()
  })

  it('opens the app offline for a learner who was signed in here', async () => {
    serverSays(learner)
    useLessonProgressStore.getState().markDayDone(1, 1)
    expect(await opens()).toBe(paths.home)

    // Opened again with no server to ask.
    useSessionStore.setState({ user: null, loaded: false })
    serverUnreachable()
    expect(await opens()).toBe(paths.home)
  })

  it('does not hold the landing page back for a server that never answers', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    const opening = opens()
    let settled = false
    void opening.then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(SESSION_WAIT_MS - 1)
    expect(settled).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(await opening).toBeNull()
  })
})
