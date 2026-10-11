import { authSessionSchema, noContentSchema, type SessionUser } from '@kuhedu/contracts'
import { apiRequest } from '../api/client'
import { useSessionStore } from './useSessionStore'

// What the build before accounts kept, and believed: "this browser is an admin".
try {
  localStorage.removeItem('kuhedu-session')
} catch {
  // Storage that cannot be reached holds nothing to remove.
}

let asking: Promise<SessionUser | null> | undefined

async function askServer(): Promise<SessionUser | null> {
  try {
    const { user } = await apiRequest('/auth/session', { schema: authSessionSchema })
    useSessionStore.getState().setUser(user)
    return user
  } catch {
    // No server to ask (offline, or none running): a guest for now, and asked again next time.
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
  asking ??= askServer().finally(() => {
    asking = undefined
  })
  return asking
}

/** Sign this browser out. Throws if the server could not be told: it is then still signed in. */
export async function signOut(): Promise<void> {
  await apiRequest('/auth/sign-out', { method: 'POST', schema: noContentSchema })
  useSessionStore.getState().setUser(null)
}
