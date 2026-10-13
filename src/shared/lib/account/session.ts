import { authSessionSchema, noContentSchema, type SessionUser } from '@kuhedu/contracts'
import { apiRequest } from '../api/client'
import { useSessionStore } from './useSessionStore'

// What the build before accounts kept, and believed: "this browser is an admin".
try {
  localStorage.removeItem('kuhedu-session')
} catch {
  // Storage that cannot be reached holds nothing to remove.
}

// One word, kept in this browser: an account was signed in here when the server last said.
// It is read only while the server cannot be asked, so that a learner's own phone still opens
// the app offline, and it lets nobody into anything the server keeps: that is the server's to
// refuse. Never who it was, and never an admin's way in.
const SIGNED_IN_KEY = 'kuhedu-signed-in'

function wasSignedInHere(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) === '1'
  } catch {
    return false
  }
}

// Kept in step with every answer of the server's, whoever heard it: the app's start, signing
// in, the code being matched, signing out.
useSessionStore.subscribe(({ loaded, user }) => {
  if (!loaded) return
  try {
    if (user?.emailVerified) localStorage.setItem(SIGNED_IN_KEY, '1')
    else localStorage.removeItem(SIGNED_IN_KEY)
  } catch {
    // Storage that cannot be written: offline, this browser is then nobody's.
  }
})

let asking: Promise<SessionUser | null> | undefined
let askedAt = 0

async function askServer(): Promise<SessionUser | null> {
  try {
    const { user } = await apiRequest('/auth/session', { schema: authSessionSchema })
    useSessionStore.getState().setUser(user)
    return user
  } catch {
    // No server to ask (offline, or none running): nobody for now, and asked again next time.
    return null
  }
}

/**
 * Who is signed in, once the server has said. Asked when the app starts and awaited by whatever
 * must know before it shows anything (the admin area); after that the store is the answer.
 */
export function loadSession(): Promise<SessionUser | null> {
  const { loaded, user } = useSessionStore.getState()
  if (loaded) return Promise.resolve(user)
  if (!asking) {
    askedAt = Date.now()
    asking = askServer().finally(() => {
      asking = undefined
    })
  }
  return asking
}

/** How long a screen waits to hear who is signed in before it goes by what this browser knows. */
export const SESSION_WAIT_MS = 2000

/**
 * Where whoever has the app open stands with it. There are no guests: a learner's screens are
 * for someone with an account, and an account is one whose address is verified.
 */
export type Standing =
  /** Nobody is signed in: the landing page and the account screen are all there is. */
  | { account: 'none' }
  /** Signed up, code not matched yet: no account, and the code step is the only way on. */
  | { account: 'unverified' }
  /**
   * Signed in. `user` is `null` when the server could not be asked and this browser was signed
   * in when it last answered: the app then opens with what the browser holds.
   */
  | { account: 'verified'; user: SessionUser | null }

/**
 * Where they stand, by the server's word. A server that cannot be reached, or has not answered
 * `SESSION_WAIT_MS` after it was asked, must not hold a screen back: the browser's own memory
 * of having been signed in then decides, until the server can be asked again.
 */
export async function accountStanding(): Promise<Standing> {
  const answer = loadSession()
  let giveUp: ReturnType<typeof setTimeout> | undefined
  const patience = new Promise<void>((resolve) => {
    giveUp = setTimeout(resolve, Math.max(0, SESSION_WAIT_MS - (Date.now() - askedAt)))
  })
  await Promise.race([answer, patience])
  clearTimeout(giveUp)

  const { loaded, user } = useSessionStore.getState()
  if (!loaded) return wasSignedInHere() ? { account: 'verified', user: null } : { account: 'none' }
  if (!user) return { account: 'none' }
  return user.emailVerified ? { account: 'verified', user } : { account: 'unverified' }
}

const leaving = new Set<() => Promise<void>>()

/**
 * Have something done before a browser is signed out, while the server still knows who it is:
 * what a learner changed and the server has not taken yet is sent then. Answers with how to
 * take it back.
 */
export function onSigningOut(task: () => Promise<void>) {
  leaving.add(task)
  return () => void leaving.delete(task)
}

/** Sign this browser out. Throws if the server could not be told: it is then still signed in. */
export async function signOut(): Promise<void> {
  // None of them may keep someone signed in: what could not be done is left undone.
  await Promise.allSettled([...leaving].map((task) => task()))
  await apiRequest('/auth/sign-out', { method: 'POST', schema: noContentSchema })
  useSessionStore.getState().setUser(null)
}
