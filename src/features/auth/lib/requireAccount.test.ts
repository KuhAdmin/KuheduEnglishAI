import type { SessionUser } from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { paths } from '@/shared/lib/paths'
import { fakeServer, serverUnreachable } from '@/test/fakeServer'
import { requireAccount } from './requireAccount'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

/** Where the guard sends whoever is at the door: a path, or `null` when it lets them in. */
async function sends(): Promise<string | null> {
  try {
    await requireAccount()
    return null
  } catch (thrown) {
    if (thrown instanceof Response) return thrown.headers.get('Location')
    throw thrown
  }
}

const serverSays = (user: SessionUser | null) =>
  fakeServer({ 'GET /auth/session': { body: { user } } })

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('requireAccount', () => {
  it('lets a learner with an account in, and an admin too', async () => {
    serverSays(learner)
    expect(await sends()).toBeNull()

    useSessionStore.setState({ user: null, loaded: false })
    serverSays({ ...learner, role: 'admin' })
    expect(await sends()).toBeNull()
  })

  it('has no guests: someone who is not signed in is led to the account screen', async () => {
    serverSays(null)
    expect(await sends()).toBe(paths.signIn)
  })

  it('leads a sign-up whose code was never entered to the code step: no account yet', async () => {
    serverSays({ ...learner, emailVerified: false })
    expect(await sends()).toBe(paths.verifyEmail)
  })

  it('opens the app offline for a browser that was signed in, and for no other', async () => {
    serverUnreachable()
    expect(await sends()).toBe(paths.signIn)

    serverSays(learner)
    expect(await sends()).toBeNull()

    // The next time the app is opened there is no server to ask.
    useSessionStore.setState({ user: null, loaded: false })
    serverUnreachable()
    expect(await sends()).toBeNull()
  })
})
