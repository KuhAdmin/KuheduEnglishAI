import { env } from '@/shared/lib/env'

/**
 * LOCAL ADMIN SIGN-IN — FOR TESTING ONLY. THIS IS NOT SECURITY.
 *
 * There is no backend yet, so this check runs in the browser and the credentials ship inside
 * the app's code, where anyone can read them. That is acceptable only because an "admin" can
 * change nothing but the settings stored in their own browser.
 *
 * TODO(auth): before any backend or public launch, delete this file and verify credentials on
 * the server. Set VITE_LOCAL_ADMIN=false to switch it off in a build.
 */
export const localAdminEnabled = env.VITE_LOCAL_ADMIN === 'true'

export function verifyLocalAdmin(username: string, password: string): boolean {
  return (
    localAdminEnabled &&
    username.trim().toLowerCase() === env.VITE_LOCAL_ADMIN_USERNAME.toLowerCase() &&
    password === env.VITE_LOCAL_ADMIN_PASSWORD
  )
}
