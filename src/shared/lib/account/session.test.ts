import type { SessionUser } from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeServer, serverUnreachable } from '@/test/fakeServer'
import { accountStanding, loadSession, SESSION_WAIT_MS, signOut } from './session'
import { useSessionStore } from './useSessionStore'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadSession', () => {
  it('asks the server who is signed in, once, and keeps nothing of who it is in the browser', async () => {
    const { calls } = fakeServer({ 'GET /auth/session': { body: { user: learner } } })

    const [first, second] = await Promise.all([loadSession(), loadSession()])

    expect(first).toEqual(learner)
    expect(second).toEqual(learner)
    expect(useSessionStore.getState()).toMatchObject({ user: learner, loaded: true })
    expect(await loadSession()).toEqual(learner)
    expect(calls).toHaveLength(1)
    // One word only: that an account was signed in here, for when the server cannot be asked.
    expect(Object.entries({ ...localStorage })).toEqual([['kuhedu-signed-in', '1']])
  })

  it('knows nobody being signed in from an answer still to come', async () => {
    fakeServer({ 'GET /auth/session': { body: { user: null } } })

    expect(await loadSession()).toBeNull()
    expect(useSessionStore.getState().loaded).toBe(true)
  })

  it('treats no server as nobody for now, and asks again the next time', async () => {
    serverUnreachable()
    expect(await loadSession()).toBeNull()
    expect(useSessionStore.getState().loaded).toBe(false)

    fakeServer({ 'GET /auth/session': { body: { user: learner } } })
    expect(await loadSession()).toEqual(learner)
  })

  it('does not take an answer in another shape for a signed-in user', async () => {
    fakeServer({ 'GET /auth/session': { body: { user: { ...learner, role: 'owner' } } } })

    expect(await loadSession()).toBeNull()
    expect(useSessionStore.getState().user).toBeNull()
  })
})

describe('accountStanding', () => {
  const serverSays = (user: SessionUser | null) =>
    fakeServer({ 'GET /auth/session': { body: { user } } })
  /** The app is opened again: who is signed in has to be asked afresh. */
  const reopen = () => useSessionStore.setState({ user: null, loaded: false })

  it('is the server’s word: nobody, a sign-up still to be verified, or an account', async () => {
    serverSays(null)
    expect(await accountStanding()).toEqual({ account: 'none' })

    reopen()
    serverSays({ ...learner, emailVerified: false })
    expect(await accountStanding()).toEqual({ account: 'unverified' })

    reopen()
    serverSays(learner)
    expect(await accountStanding()).toEqual({ account: 'verified', user: learner })
  })

  it('goes by this browser having been signed in when the server cannot be asked', async () => {
    serverUnreachable()
    expect(await accountStanding()).toEqual({ account: 'none' })

    serverSays(learner)
    await accountStanding()
    reopen()
    serverUnreachable()
    // Who it was is not kept, only that an account was signed in.
    expect(await accountStanding()).toEqual({ account: 'verified', user: null })
  })

  it('forgets that when the server says nobody is signed in, or they sign out', async () => {
    serverSays(learner)
    await accountStanding()
    reopen()
    serverSays(null)
    await accountStanding()
    reopen()
    serverUnreachable()
    expect(await accountStanding()).toEqual({ account: 'none' })

    fakeServer({ 'GET /auth/session': { body: { user: learner } }, 'POST /auth/sign-out': {} })
    await accountStanding()
    await signOut()
    reopen()
    serverUnreachable()
    expect(await accountStanding()).toEqual({ account: 'none' })
  })

  it('does not count a sign-up whose code was never entered as having been signed in', async () => {
    serverSays({ ...learner, emailVerified: false })
    await accountStanding()
    reopen()
    serverUnreachable()
    expect(await accountStanding()).toEqual({ account: 'none' })
  })

  it('does not wait long for a server that never answers, however often it is asked', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    const first = accountStanding()
    let settled = false
    void first.then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(SESSION_WAIT_MS - 1)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(await first).toEqual({ account: 'none' })

    // The wait is counted from when the server was asked: a second screen does not start it again.
    const second = accountStanding()
    await vi.advanceTimersByTimeAsync(0)
    expect(await second).toEqual({ account: 'none' })
  })
})

describe('signOut', () => {
  it('tells the server, then forgets who was signed in', async () => {
    const { calls } = fakeServer({ 'POST /auth/sign-out': {} })
    useSessionStore.getState().setUser(learner)

    await signOut()

    expect(calls).toEqual([{ method: 'POST', path: '/auth/sign-out', body: undefined }])
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('leaves the browser signed in when the server could not be told', async () => {
    serverUnreachable()
    useSessionStore.getState().setUser(learner)

    await expect(signOut()).rejects.toThrow()
    expect(useSessionStore.getState().user).toEqual(learner)
  })
})
