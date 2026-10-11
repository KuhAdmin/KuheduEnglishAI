import type { SessionUser } from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeServer, serverUnreachable } from '@/test/fakeServer'
import { loadSession, signOut } from './session'
import { useSessionStore } from './useSessionStore'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
}

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadSession', () => {
  it('asks the server who is signed in, once, and keeps none of it in the browser', async () => {
    const { calls } = fakeServer({ 'GET /auth/session': { body: { user: learner } } })

    const [first, second] = await Promise.all([loadSession(), loadSession()])

    expect(first).toEqual(learner)
    expect(second).toEqual(learner)
    expect(useSessionStore.getState()).toMatchObject({ user: learner, loaded: true })
    expect(await loadSession()).toEqual(learner)
    expect(calls).toHaveLength(1)
    expect(localStorage).toHaveLength(0)
  })

  it('knows a guest from an answer still to come', async () => {
    fakeServer({ 'GET /auth/session': { body: { user: null } } })

    expect(await loadSession()).toBeNull()
    expect(useSessionStore.getState().loaded).toBe(true)
  })

  it('treats no server as a guest for now, and asks again the next time', async () => {
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
