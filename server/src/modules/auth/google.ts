/** What Google vouches for when it signs someone in. */
export type GoogleIdentity = {
  /** Google's own id for the person, which never changes; their address can. */
  subject: string
  email: string
  /** Google has checked that the address is theirs. */
  emailVerified: boolean
  name: string | null
}

/** Checks the token Google handed the browser; `null` when it is not a good one for this app. */
export type GoogleVerifier = (credential: string) => Promise<GoogleIdentity | null>

/** The real check, against Google's published keys. The library is loaded on first use. */
export function createGoogleVerifier(clientId: string): GoogleVerifier {
  let client: Promise<import('google-auth-library').OAuth2Client> | undefined

  return async (credential) => {
    client ??= import('google-auth-library').then(({ OAuth2Client }) => new OAuth2Client())
    try {
      const ticket = await (await client).verifyIdToken({ idToken: credential, audience: clientId })
      const payload = ticket.getPayload()
      if (!payload?.sub || !payload.email) return null
      return {
        subject: payload.sub,
        email: payload.email.trim().toLowerCase(),
        emailVerified: payload.email_verified === true,
        name: payload.name?.trim() || null,
      }
    } catch {
      // Forged, expired, or made for another app: all the same to the caller.
      return null
    }
  }
}
