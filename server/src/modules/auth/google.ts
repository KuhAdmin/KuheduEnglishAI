import type { OAuth2Client } from 'google-auth-library'

/** What Google vouches for when it signs someone in. */
export type GoogleIdentity = {
  /** Google's own id for the person, which never changes; their address can. */
  subject: string
  email: string
  /** Google has checked that the address is theirs. */
  emailVerified: boolean
  name: string | null
  /** Where Google keeps their picture, when it gave one that is safe to show. */
  picture: string | null
}

const MAX_PICTURE_URL_LENGTH = 2048

/** A picture's address as it may be kept and shown: `https`, of a sane length, or nothing. */
export function safePictureUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_PICTURE_URL_LENGTH) return null
  try {
    return new URL(value).protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

/**
 * Signing in on Google's own pages. The browser is sent there and Google sends it back to our
 * callback with a one-time code, which the server trades for who it is. Nothing of Google's
 * runs in the app: this works in every browser and in the installed app, whether or not the
 * browser is already signed in to Google (the prompt Google can draw over a page appears only
 * when it is, and says nothing when it is not).
 */
export type GoogleSignIn = {
  /**
   * Google's sign-in page for this app. It sends the browser back to `redirectUri`, which must
   * be one of the client's authorized redirect URIs, with a code and this `state`.
   */
  startUrl: (redirectUri: string, state: string, nonce: string) => string
  /**
   * Who the code Google sent back stands for; `null` when it is not a good one for this app,
   * or was not made for this `nonce`.
   */
  identify: (code: string, redirectUri: string, nonce: string) => Promise<GoogleIdentity | null>
}

const SIGN_IN_PAGE = 'https://accounts.google.com/o/oauth2/v2/auth'

/** The real thing, against Google. Its library is loaded on first use. */
export function createGoogleSignIn(clientId: string, clientSecret: string): GoogleSignIn {
  let client: Promise<OAuth2Client> | undefined
  const google = () =>
    (client ??= import('google-auth-library').then(
      ({ OAuth2Client }) => new OAuth2Client(clientId, clientSecret),
    ))

  return {
    startUrl: (redirectUri, state, nonce) => {
      const query = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        // Who they are and their address: nothing of theirs at Google is asked for.
        scope: 'openid email profile',
        state,
        nonce,
        // Always asked which account: a shared phone must not sign in whoever used it last.
        prompt: 'select_account',
      }).toString()
      // A space is written `%20`, not the `+` a form would use: Google's page for choosing an
      // account has been reported to read `+` as a plus sign, find no such scope, and answer
      // "400, malformed" once an account is picked. (A real `+` is already `%2B` here, so every
      // `+` left is a space.)
      return `${SIGN_IN_PAGE}?${query.replaceAll('+', '%20')}`
    },

    identify: async (code, redirectUri, nonce) => {
      try {
        const { tokens } = await (await google()).getToken({ code, redirect_uri: redirectUri })
        if (!tokens.id_token) return null
        const ticket = await (
          await google()
        ).verifyIdToken({ idToken: tokens.id_token, audience: clientId })
        const payload = ticket.getPayload()
        // The nonce ties the answer to the browser that asked: a code from another sign-in
        // does not carry it.
        if (!payload?.sub || !payload.email || payload.nonce !== nonce) return null
        return {
          subject: payload.sub,
          email: payload.email.trim().toLowerCase(),
          emailVerified: payload.email_verified === true,
          name: payload.name?.trim() || null,
          picture: safePictureUrl(payload.picture),
        }
      } catch {
        // Used already, run out, or made for another app: all the same to the caller.
        return null
      }
    },
  }
}
