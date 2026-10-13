import { apiErrorSchema, authSessionSchema } from '@kuhedu/contracts'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp, type App, type AppServices } from '../src/app.ts'
import { emailCodes, oauthIdentities, sessions, users } from '../src/db/schema/index.ts'
import type { Mail } from '../src/lib/mailer.ts'
import { CODE_COOLDOWN_MS, MAX_CODE_ATTEMPTS } from '../src/modules/auth/codes.ts'
import type { GoogleIdentity, GoogleSignIn } from '../src/modules/auth/google.ts'
import { requireAdmin, requireVerified } from '../src/plugins/session.ts'
import { openTestDatabase, type TestDatabase } from './helpers/testDatabase.ts'

// Needs the database: runs against `<PGDATABASE>_test` (see helpers/testDatabase.ts).

const EMAIL = 'asha@example.com'
const PASSWORD = 'a long enough password'
const COOKIE = 'kuhedu_session'

let database: TestDatabase
let app: App | undefined
let outbox: Mail[]

function start(overrides: Partial<AppServices> = {}) {
  app = buildApp({
    checkDatabase: async () => true,
    services: {
      db: database.db,
      mailer: { send: async (mail) => void outbox.push(mail) },
      secret: 'a secret for the tests, long enough',
      production: false,
      // The limit has a test of its own; the others must not trip over it.
      authRequestsPerMinute: 1000,
      ...overrides,
    },
  })
  return app
}

const post = (server: App, url: string, payload?: object, cookie?: string) =>
  server.inject({
    method: 'POST',
    url: `/api/auth${url}`,
    payload,
    headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : undefined,
  })

const whoIs = async (server: App, cookie?: string) => {
  const response = await server.inject({
    method: 'GET',
    url: '/api/auth/session',
    headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : undefined,
  })
  return authSessionSchema.parse(response.json()).user
}

const cookieOf = (response: { cookies: { name: string; value: string }[] }) =>
  response.cookies.find(({ name }) => name === COOKIE)?.value ?? ''

const errorOf = (response: { json: () => unknown }) => apiErrorSchema.parse(response.json()).error

const lastCode = () => /\b\d{6}\b/.exec(outbox.at(-1)?.text ?? '')?.[0] ?? ''

/** A code that is certainly not the one that was sent. */
const wrongCode = () => (lastCode() === '000000' ? '111111' : '000000')

async function signUp(server: App, email = EMAIL, password = PASSWORD) {
  const response = await post(server, '/sign-up', { email, password })
  expect(response.statusCode).toBe(201)
  return cookieOf(response)
}

beforeAll(async () => {
  database = await openTestDatabase()
}, 60_000)

beforeEach(async () => {
  outbox = []
  await database.reset()
})

afterEach(async () => {
  await app?.close()
  app = undefined
})

afterAll(async () => {
  await database.close()
})

describe('signing up', () => {
  it('makes a learner, signs the browser in and sends a code to the address', async () => {
    const server = start()
    const response = await post(server, '/sign-up', {
      email: ' Asha@Example.com ',
      password: PASSWORD,
    })

    expect(response.statusCode).toBe(201)
    expect(authSessionSchema.parse(response.json()).user).toMatchObject({
      email: EMAIL,
      role: 'learner',
      emailVerified: false,
    })
    expect(outbox).toHaveLength(1)
    expect(outbox[0]?.to).toBe(EMAIL)
    expect(lastCode()).toMatch(/^\d{6}$/)

    expect(await whoIs(server, cookieOf(response))).toMatchObject({ email: EMAIL })
    expect(await whoIs(server)).toBeNull()
  })

  it('gives the browser a cookie that scripts cannot read and other sites do not send', async () => {
    const response = await post(start(), '/sign-up', { email: EMAIL, password: PASSWORD })

    expect(response.cookies.find(({ name }) => name === COOKIE)).toMatchObject({
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
    })
    // Plain `http` in development, or the cookie could not be tried on a phone over the LAN.
    expect(response.headers['set-cookie']).not.toMatch(/Secure/i)
  })

  it('only ever sends the cookie over HTTPS where real people use the server', async () => {
    const response = await post(start({ production: true }), '/sign-up', {
      email: EMAIL,
      password: PASSWORD,
    })

    expect(response.headers['set-cookie']).toMatch(/Secure/i)
  })

  it('keeps neither the password nor the cookie’s token nor the code as they are', async () => {
    const cookie = await signUp(start())

    const [user] = await database.db.select().from(users)
    const [session] = await database.db.select().from(sessions)
    const [code] = await database.db.select().from(emailCodes)
    expect(user?.passwordHash).toMatch(/^\$argon2id\$/)
    expect(user?.passwordHash).not.toContain(PASSWORD)
    expect(session?.tokenHash).not.toBe(cookie)
    expect(code?.codeHash).not.toContain(lastCode())
  })

  it('says so when the address already has an account, whatever its capitals', async () => {
    const server = start()
    const cookie = await signUp(server)
    // An account: the code that went to the address was matched.
    await post(server, '/verify-email', { code: lastCode() }, cookie)

    const response = await post(server, '/sign-up', {
      email: 'ASHA@example.com',
      password: PASSWORD,
    })

    expect(response.statusCode).toBe(409)
    expect(errorOf(response)).toMatchObject({
      code: 'conflict',
      fields: { email: 'auth.emailTaken' },
    })
    expect(await database.db.select().from(users)).toHaveLength(1)
  })

  it('lets an address that was never verified be signed up with again: it is nobody’s account yet', async () => {
    const server = start()
    // Somebody typed this address, rightly or not, and never entered the code.
    const firstCookie = await signUp(server, EMAIL, 'the first password, long enough')
    const firstCode = lastCode()
    await database.db
      .update(emailCodes)
      .set({ createdAt: new Date(Date.now() - CODE_COOLDOWN_MS - 1000) })

    const response = await post(server, '/sign-up', { email: EMAIL, password: PASSWORD })

    expect(response.statusCode).toBe(201)
    expect(await database.db.select().from(users)).toHaveLength(1)
    // The earlier attempt is over: its browser is signed out, its password and its code are gone.
    expect(await whoIs(server, firstCookie)).toBeNull()
    const old = await post(server, '/sign-in', {
      email: EMAIL,
      password: 'the first password, long enough',
    })
    expect(old.statusCode).toBe(401)
    expect(outbox).toHaveLength(2)
    expect(lastCode()).not.toBe('')

    const cookie = cookieOf(response)
    const stale = await post(server, '/verify-email', { code: firstCode }, cookie)
    // (One time in a million the two codes are the same six digits.)
    if (firstCode !== lastCode()) expect(stale.statusCode).toBe(400)
    const verified = await post(server, '/verify-email', { code: lastCode() }, cookie)
    expect(verified.statusCode).toBe(204)
    expect((await whoIs(server, cookie))?.emailVerified).toBe(true)
  })

  it('does not hand a disabled address, or an admin’s, to whoever signs up with it', async () => {
    const server = start()
    await signUp(server)
    await database.db.update(users).set({ status: 'disabled' }).where(eq(users.email, EMAIL))
    expect((await post(server, '/sign-up', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      409,
    )

    await database.db
      .update(users)
      .set({ status: 'active', role: 'admin' })
      .where(eq(users.email, EMAIL))
    expect((await post(server, '/sign-up', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      409,
    )
  })

  it('names the field at fault with the screen text that says why', async () => {
    const response = await post(start(), '/sign-up', { email: 'not-an-address', password: 'short' })

    expect(response.statusCode).toBe(400)
    expect(errorOf(response)).toMatchObject({
      code: 'validation_failed',
      fields: { email: 'auth.emailInvalid', password: 'auth.passwordTooShort' },
    })
  })
})

describe('signing in and out', () => {
  it('signs in with the right password', async () => {
    const server = start()
    await signUp(server)

    const response = await post(server, '/sign-in', {
      email: 'Asha@example.com',
      password: PASSWORD,
    })

    expect(response.statusCode).toBe(200)
    expect(await whoIs(server, cookieOf(response))).toMatchObject({ email: EMAIL })
  })

  it('lets someone who never entered their code back in, unverified, and sends them a new one', async () => {
    const server = start()
    await signUp(server)
    const firstCode = lastCode()
    await database.db
      .update(emailCodes)
      .set({ createdAt: new Date(Date.now() - CODE_COOLDOWN_MS - 1000) })

    const response = await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })

    expect(response.statusCode).toBe(200)
    expect(authSessionSchema.parse(response.json()).user?.emailVerified).toBe(false)
    expect(outbox).toHaveLength(2)
    expect(outbox[1]?.to).toBe(EMAIL)

    const cookie = cookieOf(response)
    if (firstCode !== lastCode()) {
      expect((await post(server, '/verify-email', { code: firstCode }, cookie)).statusCode).toBe(
        400,
      )
    }
    expect((await post(server, '/verify-email', { code: lastCode() }, cookie)).statusCode).toBe(204)
  })

  it('sends no code when someone whose address is verified signs in', async () => {
    const server = start()
    const cookie = await signUp(server)
    await post(server, '/verify-email', { code: lastCode() }, cookie)

    await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })

    expect(outbox).toHaveLength(1)
  })

  it('answers a wrong password and an unknown address in the same words', async () => {
    const server = start()
    await signUp(server)

    const wrong = await post(server, '/sign-in', { email: EMAIL, password: 'not the password' })
    const unknown = await post(server, '/sign-in', {
      email: 'nobody@example.com',
      password: PASSWORD,
    })

    expect(wrong.statusCode).toBe(401)
    expect(unknown.statusCode).toBe(401)
    expect(errorOf(wrong).code).toBe('unauthenticated')
    expect(unknown.json()).toEqual(wrong.json())
    expect(cookieOf(wrong)).toBe('')
  })

  it('does not sign a disabled account in, and signs it out where it was', async () => {
    const server = start()
    const cookie = await signUp(server)
    await database.db.update(users).set({ status: 'disabled' })

    expect(await whoIs(server, cookie)).toBeNull()
    expect((await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      401,
    )
  })

  it('signs out: the cookie goes and would no longer work if kept', async () => {
    const server = start()
    const cookie = await signUp(server)

    const response = await post(server, '/sign-out', undefined, cookie)

    expect(response.statusCode).toBe(204)
    expect(cookieOf(response)).toBe('')
    expect(await whoIs(server, cookie)).toBeNull()
  })

  it('keeps a browser in use signed in, and lets one left alone run out', async () => {
    const server = start()
    const cookie = await signUp(server)
    const longAgo = new Date(Date.now() - 60 * 60 * 1000)
    await database.db.update(sessions).set({ lastSeenAt: longAgo })
    const [before] = await database.db.select().from(sessions)

    const response = await server.inject({
      method: 'GET',
      url: '/api/auth/session',
      headers: { cookie: `${COOKIE}=${cookie}` },
    })
    const [after] = await database.db.select().from(sessions)

    expect(cookieOf(response)).toBe(cookie)
    expect(after?.expiresAt.getTime()).toBeGreaterThan(before?.expiresAt.getTime() ?? Infinity)

    await database.db.update(sessions).set({ expiresAt: longAgo })
    expect(await whoIs(server, cookie)).toBeNull()
  })
})

describe('verifying the address', () => {
  it('takes the code that was sent', async () => {
    const server = start()
    const cookie = await signUp(server)

    const response = await post(server, '/verify-email', { code: ` ${lastCode()} ` }, cookie)

    expect(response.statusCode).toBe(204)
    expect((await whoIs(server, cookie))?.emailVerified).toBe(true)
  })

  it('refuses a wrong code, someone who is not signed in, and a code that has run out', async () => {
    const server = start()
    const cookie = await signUp(server)

    const wrong = await post(server, '/verify-email', { code: wrongCode() }, cookie)
    expect(wrong.statusCode).toBe(400)
    expect(errorOf(wrong).fields).toEqual({ code: 'auth.codeWrong' })

    expect((await post(server, '/verify-email', { code: lastCode() })).statusCode).toBe(401)

    await database.db.update(emailCodes).set({ expiresAt: new Date(Date.now() - 1000) })
    expect((await post(server, '/verify-email', { code: lastCode() }, cookie)).statusCode).toBe(400)
    expect((await whoIs(server, cookie))?.emailVerified).toBe(false)
  })

  it('stops taking guesses after a few, even the right one', async () => {
    const server = start()
    const cookie = await signUp(server)

    for (let guess = 0; guess < MAX_CODE_ATTEMPTS; guess += 1) {
      expect((await post(server, '/verify-email', { code: wrongCode() }, cookie)).statusCode).toBe(
        400,
      )
    }
    const response = await post(server, '/verify-email', { code: lastCode() }, cookie)

    expect(response.statusCode).toBe(429)
    expect(errorOf(response).code).toBe('rate_limited')
    expect((await whoIs(server, cookie))?.emailVerified).toBe(false)
  })

  it('sends a new code on request, but not twice in a minute, and the old one stops working', async () => {
    const server = start()
    const cookie = await signUp(server)
    const first = lastCode()

    expect((await post(server, '/verify-email/resend', undefined, cookie)).statusCode).toBe(429)
    expect(outbox).toHaveLength(1)

    const aMinuteAgo = new Date(Date.now() - CODE_COOLDOWN_MS - 1000)
    await database.db.update(emailCodes).set({ createdAt: aMinuteAgo })
    expect((await post(server, '/verify-email/resend', undefined, cookie)).statusCode).toBe(204)
    expect(outbox).toHaveLength(2)

    if (lastCode() !== first) {
      expect((await post(server, '/verify-email', { code: first }, cookie)).statusCode).toBe(400)
    }
    expect((await post(server, '/verify-email', { code: lastCode() }, cookie)).statusCode).toBe(204)
  })
})

describe('a forgotten password', () => {
  const mailSent = () => expect.poll(() => outbox.length)

  it('answers the same whether or not the address has an account', async () => {
    const server = start()
    await signUp(server)
    outbox = []

    const unknown = await post(server, '/password/forgot', { email: 'nobody@example.com' })
    const known = await post(server, '/password/forgot', { email: EMAIL })

    expect(unknown.statusCode).toBe(204)
    expect(known.statusCode).toBe(204)
    expect(known.body).toBe(unknown.body)
    await mailSent().toBe(1)
    expect(outbox[0]?.to).toBe(EMAIL)
  })

  it('sets a new password with the code, verifies the address and signs every browser out', async () => {
    const server = start()
    const cookie = await signUp(server)
    await post(server, '/password/forgot', { email: EMAIL })
    await mailSent().toBe(2)

    const response = await post(server, '/password/reset', {
      email: EMAIL,
      code: lastCode(),
      password: 'a brand new password',
    })

    expect(response.statusCode).toBe(204)
    expect(await whoIs(server, cookie)).toBeNull()
    expect((await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      401,
    )
    const signedIn = await post(server, '/sign-in', {
      email: EMAIL,
      password: 'a brand new password',
    })
    expect(authSessionSchema.parse(signedIn.json()).user?.emailVerified).toBe(true)
  })

  it('refuses a wrong code, and a code for an address that has no account, alike', async () => {
    const server = start()
    await signUp(server)
    await post(server, '/password/forgot', { email: EMAIL })
    await mailSent().toBe(2)

    const wrong = await post(server, '/password/reset', {
      email: EMAIL,
      code: wrongCode(),
      password: 'a brand new password',
    })
    const nobody = await post(server, '/password/reset', {
      email: 'nobody@example.com',
      code: '123456',
      password: 'a brand new password',
    })

    expect(wrong.statusCode).toBe(400)
    expect(nobody.json()).toEqual(wrong.json())
    expect((await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      200,
    )
  })
})

describe('signing in with Google', () => {
  const identity: GoogleIdentity = {
    subject: 'google-1',
    email: EMAIL,
    emailVerified: true,
    name: 'Asha',
    picture: 'https://lh3.googleusercontent.com/a/asha=s96-c',
  }
  const HOST = 'app.kuhedu.test'
  const GOOGLE_COOKIE = 'kuhedu_google'
  /** What Google was asked, each time a code was traded. */
  let traded: { code: string; redirectUri: string; nonce: string }[]

  // Stands in for Google: its page is an address that says what it was given, and the code
  // "good" stands for `who`.
  const withGoogle = (who: GoogleIdentity | null = identity) => {
    traded = []
    const google: GoogleSignIn = {
      startUrl: (redirectUri, state, nonce) =>
        `https://google.test/sign-in?${new URLSearchParams({ redirectUri, state, nonce })}`,
      identify: async (code, redirectUri, nonce) => {
        traded.push({ code, redirectUri, nonce })
        return code === 'good' ? who : null
      },
    }
    return start({ google })
  }

  const get = (server: App, url: string, cookie?: string) =>
    server.inject({
      method: 'GET',
      url: `/api/auth${url}`,
      headers: { host: HOST, ...(cookie && { cookie }) },
    })

  /** Tap the button: the browser is sent to Google, keeping what must come back with it. */
  async function leaveForGoogle(server: App) {
    const response = await get(server, '/google/start')
    const page = new URL(response.headers.location as string)
    const kept = response.cookies.find(({ name }) => name === GOOGLE_COOKIE)
    return {
      response,
      page,
      state: page.searchParams.get('state') ?? '',
      nonce: page.searchParams.get('nonce') ?? '',
      cookie: `${GOOGLE_COOKIE}=${kept?.value ?? ''}`,
      kept,
    }
  }

  /** The whole way: to Google and back with a code. Gives where the browser ends up. */
  async function throughGoogle(server: App, code = 'good') {
    const { state, cookie } = await leaveForGoogle(server)
    return get(server, `/google/callback?${new URLSearchParams({ code, state })}`, cookie)
  }

  it('does not exist until Google sign-in is set up', async () => {
    const server = start()

    expect((await get(server, '/google/start')).statusCode).toBe(404)
    expect((await get(server, '/google/callback?code=good&state=x')).statusCode).toBe(404)
  })

  it('sends the browser to Google, to come back to this server as the browser reached it', async () => {
    const { response, page, state, nonce, kept } = await leaveForGoogle(withGoogle())

    expect(response.statusCode).toBe(302)
    expect(page.origin).toBe('https://google.test')
    expect(page.searchParams.get('redirectUri')).toBe(`http://${HOST}/api/auth/google/callback`)
    expect(state.length).toBeGreaterThanOrEqual(32)
    expect(nonce.length).toBeGreaterThanOrEqual(32)
    // What must come back is kept where no page can read it, and only for this.
    expect(kept).toMatchObject({
      value: `${state}.${nonce}`,
      httpOnly: true,
      sameSite: 'Lax',
      path: '/api/auth/google',
    })
  })

  it('makes an account the first time and finds it again the next', async () => {
    const server = withGoogle()

    const first = await throughGoogle(server)
    const second = await throughGoogle(server)

    // Signed in, and sent to the app's front door.
    expect(first.statusCode).toBe(302)
    expect(first.headers.location).toBe('/')
    expect(traded[0]).toMatchObject({
      code: 'good',
      redirectUri: `http://${HOST}/api/auth/google/callback`,
    })
    const user = await whoIs(server, cookieOf(first))
    expect(user).toMatchObject({
      email: EMAIL,
      emailVerified: true,
      displayName: 'Asha',
      pictureUrl: 'https://lh3.googleusercontent.com/a/asha=s96-c',
    })
    expect((await whoIs(server, cookieOf(second)))?.id).toBe(user?.id)
    expect(await database.db.select().from(users)).toHaveLength(1)
    expect(await database.db.select().from(oauthIdentities)).toHaveLength(1)
    // What was kept for the way back is not kept any longer.
    expect(first.cookies.find(({ name }) => name === GOOGLE_COOKIE)?.value).toBe('')
  })

  it('ties Google’s answer to the browser that asked', async () => {
    const server = withGoogle()
    const { state, nonce, cookie } = await leaveForGoogle(server)

    await get(server, `/google/callback?${new URLSearchParams({ code: 'good', state })}`, cookie)

    expect(traded).toEqual([
      { code: 'good', redirectUri: `http://${HOST}/api/auth/google/callback`, nonce },
    ])
  })

  it('signs nobody in on an answer this browser did not ask for', async () => {
    const server = withGoogle()
    const { state, cookie } = await leaveForGoogle(server)
    const back = (query: Record<string, string>, sent?: string) =>
      get(server, `/google/callback?${new URLSearchParams(query)}`, sent)

    // No sign-in begun here, another one's `state`, and none at all.
    for (const response of [
      await back({ code: 'good', state }),
      await back({ code: 'good', state: 'someone-elses' }, cookie),
      await back({ code: 'good' }, cookie),
    ]) {
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/sign-in?google=failed')
      expect(cookieOf(response)).toBe('')
    }
    expect(traded).toEqual([])
    expect(await database.db.select().from(users)).toHaveLength(0)
  })

  it('goes back to the account screen, saying nothing, when Google’s page was closed or refused', async () => {
    const server = withGoogle()
    const { state, cookie } = await leaveForGoogle(server)

    const response = await get(
      server,
      `/google/callback?${new URLSearchParams({ error: 'access_denied', state })}`,
      cookie,
    )

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/sign-in')
    expect(cookieOf(response)).toBe('')
  })

  it('refuses a code Google does not vouch for, and an address Google has not checked', async () => {
    const forged = await throughGoogle(withGoogle(), 'forged')
    expect(forged.headers.location).toBe('/sign-in?google=failed')
    expect(cookieOf(forged)).toBe('')
    await app?.close()

    const unchecked = await throughGoogle(withGoogle({ ...identity, emailVerified: false }))
    expect(unchecked.headers.location).toBe('/sign-in?google=failed')
    expect(cookieOf(unchecked)).toBe('')
    expect(await database.db.select().from(users)).toHaveLength(0)
  })

  it('takes over an account nobody proved was theirs: its password and its browsers go', async () => {
    const server = withGoogle()
    const strangersCookie = await signUp(server)

    const response = await throughGoogle(server)

    expect(response.headers.location).toBe('/')
    expect(await whoIs(server, strangersCookie)).toBeNull()
    expect((await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      401,
    )
    expect(await database.db.select().from(users)).toHaveLength(1)
  })

  it('joins an account whose address was verified, which keeps its password', async () => {
    const server = withGoogle()
    const cookie = await signUp(server)
    await post(server, '/verify-email', { code: lastCode() }, cookie)

    const response = await throughGoogle(server)

    expect((await whoIs(server, cookieOf(response)))?.id).toBe((await whoIs(server, cookie))?.id)
    expect((await post(server, '/sign-in', { email: EMAIL, password: PASSWORD })).statusCode).toBe(
      200,
    )
  })

  it('keeps their picture as Google has it now, and what it had when Google gives none', async () => {
    const first = await throughGoogle(withGoogle())
    expect((await whoIs(app as App, cookieOf(first)))?.pictureUrl).toBe(identity.picture)
    await app?.close()

    // Changed at Google: the next sign-in brings the new one.
    const changed = 'https://lh3.googleusercontent.com/a/asha-new=s96-c'
    const second = await throughGoogle(withGoogle({ ...identity, picture: changed }))
    expect((await whoIs(app as App, cookieOf(second)))?.pictureUrl).toBe(changed)
    await app?.close()

    const third = await throughGoogle(withGoogle({ ...identity, picture: null }))
    expect((await whoIs(app as App, cookieOf(third)))?.pictureUrl).toBe(changed)
  })

  it('has no picture for someone who signed up with their email', async () => {
    const server = start()
    expect((await whoIs(server, await signUp(server)))?.pictureUrl).toBeNull()
  })

  it('sends an admin who signs in with Google to the admin area', async () => {
    const server = withGoogle()
    const cookie = await signUp(server)
    await post(server, '/verify-email', { code: lastCode() }, cookie)
    await database.db.update(users).set({ role: 'admin' }).where(eq(users.email, EMAIL))

    expect((await throughGoogle(server)).headers.location).toBe('/admin')
  })
})

describe('what guards every route', () => {
  it('turns away a request that another site’s page made', async () => {
    const server = start()
    const send = (headers: Record<string, string>) =>
      server.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        payload: { email: EMAIL, password: PASSWORD },
        headers: { host: 'app.kuhedu.test', ...headers },
      })

    const foreign = await send({ origin: 'https://evil.example' })
    const crossSite = await send({ 'sec-fetch-site': 'cross-site' })
    expect(foreign.statusCode).toBe(403)
    expect(errorOf(foreign).code).toBe('forbidden')
    expect(crossSite.statusCode).toBe(403)
    expect(await database.db.select().from(users)).toHaveLength(0)

    const own = await send({ origin: 'https://app.kuhedu.test', 'sec-fetch-site': 'same-origin' })
    expect(own.statusCode).toBe(201)
  })

  it('stops an address that keeps trying', async () => {
    const server = start({ authRequestsPerMinute: 3 })
    const attempt = () => post(server, '/sign-in', { email: EMAIL, password: 'a guess' })

    for (let tries = 0; tries < 3; tries += 1) expect((await attempt()).statusCode).toBe(401)
    const response = await attempt()

    expect(response.statusCode).toBe(429)
    expect(errorOf(response).code).toBe('rate_limited')
  })

  it('lets only an address that was verified past `requireVerified`', async () => {
    const server = start()
    server.get('/api/mine', { preHandler: requireVerified }, () => ({ ok: true }))
    const cookie = await signUp(server)
    const ask = (withCookie?: string) =>
      server.inject({
        method: 'GET',
        url: '/api/mine',
        headers: withCookie ? { cookie: `${COOKIE}=${withCookie}` } : undefined,
      })

    expect((await ask()).statusCode).toBe(401)
    // Signed up, code not entered: not an account yet.
    const before = await ask(cookie)
    expect(before.statusCode).toBe(403)
    expect(errorOf(before).code).toBe('forbidden')

    await post(server, '/verify-email', { code: lastCode() }, cookie)
    expect((await ask(cookie)).statusCode).toBe(200)
  })

  it('lets only an admin past `requireAdmin`', async () => {
    const server = start()
    server.get('/api/admin-only', { preHandler: requireAdmin }, () => ({ ok: true }))
    const cookie = await signUp(server)
    const ask = (withCookie?: string) =>
      server.inject({
        method: 'GET',
        url: '/api/admin-only',
        headers: withCookie ? { cookie: `${COOKIE}=${withCookie}` } : undefined,
      })

    expect((await ask()).statusCode).toBe(401)
    expect((await ask(cookie)).statusCode).toBe(403)

    await database.db.update(users).set({ role: 'admin' }).where(eq(users.email, EMAIL))
    expect((await ask(cookie)).statusCode).toBe(200)
  })

  it('tells browsers and proxies not to keep or reinterpret an answer', async () => {
    const response = await start().inject({ method: 'GET', url: '/api/auth/session' })

    expect(response.headers).toMatchObject({
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    })
  })
})
