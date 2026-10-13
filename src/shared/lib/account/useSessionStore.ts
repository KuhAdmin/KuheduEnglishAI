import type { SessionUser } from '@kuhedu/contracts'
import { create } from 'zustand'

type SessionState = {
  /** Who is signed in; `null` for nobody, and until the server has been asked. */
  user: SessionUser | null
  /** The server has said who is signed in (see `loadSession`). */
  loaded: boolean
  setUser: (user: SessionUser | null) => void
}

/**
 * Who is using the app, as the server says. Who they are is not kept in the browser's storage:
 * the cookie that signs the browser in cannot be read by the page, and this is asked afresh
 * each time the app starts. (`session.ts` keeps one word for when the server cannot be asked:
 * that an account was signed in here.)
 */
export const useSessionStore = create<SessionState>()((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user, loaded: true }),
}))
