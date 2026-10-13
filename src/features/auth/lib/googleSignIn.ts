import { env } from '@/shared/lib/env'

/** Google sign-in is offered only in a build that was told the server is set up for it. */
export const googleConfigured = Boolean(env.VITE_GOOGLE_CLIENT_ID)

/** What the server adds to the account screen's address when Google's answer did not sign anyone in. */
export const GOOGLE_OUTCOME_PARAM = 'google'
export const GOOGLE_FAILED = 'failed'

/**
 * Hand the browser to Google's own sign-in page, by way of our server. This leaves the app:
 * the browser comes back signed in at the app's front door, or at the account screen with
 * `?google=failed`. It is an address the browser goes to, not a call (so not `apiRequest`),
 * and nothing of Google's runs in the app: it works in every browser and in the installed app,
 * whether or not the browser is already signed in to Google.
 */
export function goToGoogle(): void {
  window.location.assign(`${env.VITE_API_BASE_URL}/auth/google/start`)
}
