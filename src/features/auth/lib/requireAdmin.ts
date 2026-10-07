import { redirect } from 'react-router'
import { paths } from '@/shared/lib/paths'
import { useSessionStore } from '../store/useSessionStore'
import { localAdminEnabled } from './localAdmin'

/** Route loader: only a signed-in admin may open the routes it guards. */
export function requireAdmin() {
  if (!localAdminEnabled || useSessionStore.getState().role !== 'admin') {
    throw redirect(paths.signIn)
  }
  return null
}
