import { redirect } from 'react-router'
import { loadSession, useSessionStore } from '@/shared/lib/account'
import { paths } from '@/shared/lib/paths'

/**
 * Route loader: only a signed-in admin may open the routes it guards. It waits for the server
 * to say who is signed in. This keeps the screens out of sight, no more: the server itself
 * refuses every admin request from anyone else.
 */
export async function requireAdmin() {
  await loadSession()
  if (useSessionStore.getState().user?.role !== 'admin') throw redirect(paths.signIn)
  return null
}
