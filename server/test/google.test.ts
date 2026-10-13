import { describe, expect, it } from 'vitest'
import { createGoogleSignIn, safePictureUrl } from '../src/modules/auth/google.ts'

describe('the address of Google’s sign-in page', () => {
  const google = createGoogleSignIn('the-id.apps.googleusercontent.com', 'the-secret')
  const address = google.startUrl(
    'http://localhost:5173/api/auth/google/callback',
    'a-state_with+a plus',
    'a-nonce',
  )

  it('asks Google who the person is, to send them back to our callback', () => {
    const page = new URL(address)

    expect(`${page.origin}${page.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(page.searchParams)).toEqual({
      client_id: 'the-id.apps.googleusercontent.com',
      redirect_uri: 'http://localhost:5173/api/auth/google/callback',
      response_type: 'code',
      scope: 'openid email profile',
      state: 'a-state_with+a plus',
      nonce: 'a-nonce',
      prompt: 'select_account',
    })
  })

  it('writes a space as %20, never as the + Google’s account chooser misreads', () => {
    expect(address).toContain('scope=openid%20email%20profile')
    expect(address).not.toContain('+')
    // A plus sign that is meant as one is still one.
    expect(address).toContain('state=a-state_with%2Ba%20plus')
  })

  it('never carries the secret', () => {
    expect(address).not.toContain('the-secret')
  })
})

describe('a picture’s address from Google', () => {
  it('is kept only when it is an https address of a sane length', () => {
    const picture = 'https://lh3.googleusercontent.com/a/someone=s96-c'
    expect(safePictureUrl(picture)).toBe(picture)

    for (const unsafe of [
      'http://lh3.googleusercontent.com/a/someone',
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '/a/someone',
      'not an address',
      `https://example.com/${'x'.repeat(2048)}`,
      '',
      undefined,
      7,
    ]) {
      expect(safePictureUrl(unsafe)).toBeNull()
    }
  })
})
