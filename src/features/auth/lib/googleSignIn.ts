import { env } from '@/shared/lib/env'

const SCRIPT_URL = 'https://accounts.google.com/gsi/client'

/** The part of Google's sign-in script this app uses. */
type GoogleAccounts = {
  id: {
    initialize: (options: {
      client_id: string
      callback: (response: { credential?: string }) => void
      use_fedcm_for_prompt?: boolean
    }) => void
    prompt: (
      onMoment?: (moment: {
        isSkippedMoment?: () => boolean
        isDismissedMoment?: () => boolean
        isNotDisplayed?: () => boolean
      }) => void,
    ) => void
  }
}

declare global {
  interface Window {
    google?: { accounts?: GoogleAccounts }
  }
}

/** Google sign-in is offered only in a build that was given the app's Google id. */
export const googleConfigured = Boolean(env.VITE_GOOGLE_CLIENT_ID)

let loading: Promise<GoogleAccounts> | undefined

/** Google's script, fetched the first time someone taps the button and not before. */
function loadGoogle(): Promise<GoogleAccounts> {
  loading ??= new Promise<GoogleAccounts>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      const accounts = window.google?.accounts
      if (accounts) resolve(accounts)
      else reject(new Error('Google sign-in did not load'))
    }
    script.onerror = () => reject(new Error('Google sign-in did not load'))
    document.head.append(script)
  }).catch((error: unknown) => {
    // Let the next tap try again.
    loading = undefined
    throw error
  })
  return loading
}

/**
 * Ask Google who this is. Gives the token Google hands back, for the server to check, or
 * `null` when the visitor closed Google's prompt or the browser would not show it.
 * TODO(auth): not yet tried against Google itself (that needs the app's Google id); check it
 * on a real phone before turning it on.
 */
export async function askGoogle(): Promise<string | null> {
  const clientId = env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) return null
  const accounts = await loadGoogle()

  return new Promise((resolve) => {
    accounts.id.initialize({
      client_id: clientId,
      use_fedcm_for_prompt: true,
      callback: ({ credential }) => resolve(credential ?? null),
    })
    accounts.id.prompt((moment) => {
      const closed =
        moment.isSkippedMoment?.() || moment.isDismissedMoment?.() || moment.isNotDisplayed?.()
      if (closed) resolve(null)
    })
  })
}
