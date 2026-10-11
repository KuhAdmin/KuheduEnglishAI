import { redirect } from 'react-router'
import { loadSession, useSessionStore } from '@/shared/lib/account'
import { paths } from '@/shared/lib/paths'

/** Route loader for the code step: it is for someone signed in whose address is not verified yet. */
export async function requireUnverified() {
  await loadSession()
  const { user } = useSessionStore.getState()
  if (!user) throw redirect(paths.signUp)
  if (user.emailVerified) throw redirect(paths.home)
  return null
}
