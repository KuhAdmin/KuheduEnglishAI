import {
  apiErrorSchema,
  appConfigResponseSchema,
  defaultLanguagesConfig,
  storedAppConfigSchema,
} from '@kuhedu/contracts'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp, type App, type AppServices } from '../src/app.ts'
import {
  appConfig,
  auditLog,
  contentHistory,
  textOverrides,
  users,
} from '../src/db/schema/index.ts'
import type { Mail } from '../src/lib/mailer.ts'
import { openTestDatabase, type TestDatabase } from './helpers/testDatabase.ts'

// Needs the database: runs against `<PGDATABASE>_test` (see helpers/testDatabase.ts).

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
      authRequestsPerMinute: 1000,
      appConfigRequestsPerMinute: 1000,
      ...overrides,
    },
  })
  return app
}

const lastCode = () => /\b\d{6}\b/.exec(outbox.at(-1)?.text ?? '')?.[0] ?? ''

/** Someone with an account, signed in; an admin when asked for. */
async function signedIn(server: App, email: string, role: 'learner' | 'admin' = 'learner') {
  const made = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-up',
    payload: { email, password: 'a long enough password' },
  })
  const cookie = made.cookies.find(({ name }) => name === COOKIE)?.value ?? ''
  await server.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: { code: lastCode() },
    headers: { cookie: `${COOKIE}=${cookie}` },
  })
  if (role === 'admin') {
    await database.db.update(users).set({ role }).where(eq(users.email, email))
  }
  return cookie
}

const admin = (server: App, email = 'admin@example.com') => signedIn(server, email, 'admin')

const asWho = (cookie?: string) => (cookie ? { cookie: `${COOKIE}=${cookie}` } : undefined)

const read = (server: App, headers?: Record<string, string>) =>
  server.inject({ method: 'GET', url: '/api/app-config', headers })

const everything = async (server: App) => appConfigResponseSchema.parse((await read(server)).json())

const save = (server: App, cookie: string | undefined, name: string, value: unknown, version = 0) =>
  server.inject({
    method: 'PUT',
    url: `/api/admin/app-config/${name}`,
    payload: { value, version },
    headers: asWho(cookie),
  })

const remove = (server: App, cookie: string | undefined, name: string, version: number) =>
  server.inject({
    method: 'DELETE',
    url: `/api/admin/app-config/${name}?version=${version}`,
    headers: asWho(cookie),
  })

type Change = { language: string; key: string; from: string | null; to: string | null }

const change = (server: App, cookie: string | undefined, scope: string, changes: Change[]) =>
  server.inject({
    method: 'PATCH',
    url: `/api/admin/app-config/texts/${scope}`,
    payload: { changes },
    headers: asWho(cookie),
  })

const errorOf = (response: { json: () => unknown }) => apiErrorSchema.parse(response.json()).error

/** The languages an admin offers: English and Tamil. */
const languages = (tamil = 'தமிழ்') => ({
  languages: [
    { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: '/flags/us.svg' },
    { code: 'ta', nativeName: tamil, caption: 'Tamil', flagUrl: null },
  ],
  defaultCode: 'ta',
})

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

describe('GET /api/app-config', () => {
  it('answers anyone, with nothing where nobody has written anything', async () => {
    const response = await read(start())

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      settings: { landing: null, languages: null, 'learner-profiles': null },
      texts: { screen: {}, curriculum: {} },
    })
  })

  it('gives every setting and every reworded text, by scope and language', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())
    await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
      { language: 'hi', key: 'home.title', from: null, to: 'होम' },
    ])
    await change(server, cookie, 'curriculum', [
      { language: 'en', key: 'week.16.goal', from: null, to: 'I can talk about my day.' },
    ])

    const { settings, texts } = await everything(server)
    expect(settings.languages).toEqual(languages())
    expect(settings.landing).toBeNull()
    expect(texts).toEqual({
      screen: { bn: { 'home.title': 'হোম' }, hi: { 'home.title': 'होम' } },
      curriculum: { en: { 'week.16.goal': 'I can talk about my day.' } },
    })
  })

  it('lets a browser keep its answer and ask whether it still stands', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())

    const first = await read(server)
    const etag = String(first.headers.etag)
    expect(first.headers['cache-control']).toBe('no-cache')

    const again = await read(server, { 'if-none-match': etag })
    expect(again.statusCode).toBe(304)
    expect(again.body).toBe('')

    // One text reworded: the answer the browser has no longer stands.
    await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
    ])
    const after = await read(server, { 'if-none-match': etag })
    expect(after.statusCode).toBe(200)
    expect(after.headers.etag).not.toBe(etag)
  })

  it('turns away an address that asks for more than its share', async () => {
    const server = start({ appConfigRequestsPerMinute: 2 })

    await read(server)
    await read(server)
    const third = await read(server)

    expect(third.statusCode).toBe(429)
    expect(errorOf(third).code).toBe('rate_limited')
  })
})

describe('a settings object an admin saves', () => {
  it.each([
    ['PUT', '/languages'],
    ['DELETE', '/languages?version=1'],
    ['PATCH', '/texts/screen'],
    ['GET', ''],
  ] as const)('is an admin’s alone to write and to list: %s %s', async (method, path) => {
    const server = start()
    const ask = (cookie?: string) =>
      server.inject({
        method,
        url: `/api/admin/app-config${path}`,
        payload:
          method === 'PUT'
            ? { value: languages(), version: 0 }
            : method === 'PATCH'
              ? { changes: [{ language: 'bn', key: 'home.title', from: null, to: 'হোম' }] }
              : undefined,
        headers: asWho(cookie),
      })

    const nobody = await ask()
    expect(nobody.statusCode).toBe(401)
    expect(errorOf(nobody).code).toBe('unauthenticated')

    const learner = await ask(await signedIn(server, 'asha@example.com'))
    expect(learner.statusCode).toBe(403)
    expect(errorOf(learner).code).toBe('forbidden')
    expect(await database.db.select().from(appConfig)).toEqual([])
    expect(await database.db.select().from(textOverrides)).toEqual([])
  })

  it('is kept as the screens will read it, and counted from its first save', async () => {
    const server = start()
    const cookie = await admin(server)

    const saved = await save(server, cookie, 'languages', {
      ...languages(),
      // A language without a name, and one given twice: neither is kept.
      languages: [...languages().languages, { code: 'te' }, languages().languages[0]],
    })

    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toEqual({ version: 1 })
    const [row] = await database.db.select().from(appConfig)
    expect(row).toMatchObject({ name: 'languages', version: 1, value: languages() })
    expect(row?.updatedBy).not.toBeNull()
  })

  it('is what is built in when nothing of it is usable', async () => {
    const server = start()
    const cookie = await admin(server)

    await save(server, cookie, 'languages', { languages: 'all of them' })

    expect((await everything(server)).settings.languages).toEqual(defaultLanguagesConfig)
  })

  it('takes a later save in place of an earlier one, and keeps what it replaced', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())

    const second = await save(server, cookie, 'languages', languages('Tamil'), 1)

    expect(second.json()).toEqual({ version: 2 })
    expect((await everything(server)).settings.languages).toEqual(languages('Tamil'))
    const [history] = await database.db.select().from(contentHistory)
    expect(history).toMatchObject({ source: 'app_config', ref: 'languages', version: 1 })
    expect(history?.value).toEqual(languages())
    const actions = (await database.db.select().from(auditLog))
      .map((entry) => entry.action)
      .filter((action) => action.startsWith('app_config'))
    expect(actions).toEqual(['app_config.save', 'app_config.save'])
  })

  it('does not write over what another admin saved in between', async () => {
    const server = start()
    const first = await admin(server)
    const second = await admin(server, 'other.admin@example.com')
    await save(server, first, 'languages', languages())
    // Both opened version 1; the second saves first.
    await save(server, second, 'languages', languages('Tamil'), 1)

    const late = await save(server, first, 'languages', languages('தமிழ் மொழி'), 1)

    expect(late.statusCode).toBe(409)
    expect(errorOf(late).code).toBe('conflict')
    expect((await everything(server)).settings.languages).toEqual(languages('Tamil'))
  })

  it('changes nothing when what is saved is what is already kept', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())

    const again = await save(server, cookie, 'languages', languages(), 1)

    expect(again.json()).toEqual({ version: 1 })
    expect(await database.db.select().from(contentHistory)).toEqual([])
  })

  it('can be removed, which leaves it to what the app has built in', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())

    const stale = await remove(server, cookie, 'languages', 0)
    expect(stale.statusCode).toBe(409)

    const removed = await remove(server, cookie, 'languages', 1)
    expect(removed.statusCode).toBe(204)
    expect((await everything(server)).settings.languages).toBeNull()
    const [history] = await database.db.select().from(contentHistory)
    expect(history?.value).toEqual(languages())
    // Removing what is gone already is what was asked for.
    expect((await remove(server, cookie, 'languages', 1)).statusCode).toBe(204)
  })

  it('has no name it does not know', async () => {
    const server = start()
    const response = await save(server, await admin(server), 'week-dialogues', {})

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
  })

  it('is listed with its version, beside every text, for the editors to open with', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())
    await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
    ])

    const response = await server.inject({
      method: 'GET',
      url: '/api/admin/app-config',
      headers: asWho(cookie),
    })

    expect(storedAppConfigSchema.parse(response.json())).toEqual({
      settings: [{ name: 'languages', value: languages(), version: 1 }],
      texts: { screen: { bn: { 'home.title': 'হোম' } }, curriculum: {} },
    })
  })
})

describe('texts an admin rewords', () => {
  it('are kept one by one, and a text set back to the built-in wording is removed', async () => {
    const server = start()
    const cookie = await admin(server)
    await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
      { language: 'bn', key: 'home.subtitle', from: null, to: 'আজকের পাঠ' },
    ])

    const response = await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: 'হোম', to: 'বাড়ি' },
      { language: 'bn', key: 'home.subtitle', from: 'আজকের পাঠ', to: null },
    ])

    expect(response.statusCode).toBe(204)
    expect((await everything(server)).texts.screen).toEqual({ bn: { 'home.title': 'বাড়ি' } })
    const history = await database.db.select().from(contentHistory)
    expect(history.map(({ ref, value }) => [ref, value]).sort()).toEqual([
      ['screen/bn/home.subtitle', 'আজকের পাঠ'],
      ['screen/bn/home.title', 'হোম'],
    ])
  })

  it('let two admins reword different texts without either losing theirs', async () => {
    const server = start()
    const first = await admin(server)
    const second = await admin(server, 'other.admin@example.com')

    await change(server, first, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
    ])
    await change(server, second, 'screen', [
      { language: 'hi', key: 'home.title', from: null, to: 'होम' },
    ])

    expect((await everything(server)).texts.screen).toEqual({
      bn: { 'home.title': 'হোম' },
      hi: { 'home.title': 'होम' },
    })
  })

  it('refuse the whole save when one text was changed by someone else since', async () => {
    const server = start()
    const first = await admin(server)
    const second = await admin(server, 'other.admin@example.com')
    await change(server, second, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
    ])

    // The first admin opened the editor before that save, when the text was the built-in one.
    const late = await change(server, first, 'screen', [
      { language: 'bn', key: 'home.subtitle', from: null, to: 'আজকের পাঠ' },
      { language: 'bn', key: 'home.title', from: null, to: 'বাড়ি' },
    ])

    expect(late.statusCode).toBe(409)
    expect(errorOf(late).code).toBe('conflict')
    expect((await everything(server)).texts.screen).toEqual({ bn: { 'home.title': 'হোম' } })
  })

  it('change nothing when sent again, after the first time was taken', async () => {
    const server = start()
    const cookie = await admin(server)
    const changes = [{ language: 'bn', key: 'home.title', from: null, to: 'হোম' }]
    await change(server, cookie, 'screen', changes)

    const again = await change(server, cookie, 'screen', changes)

    expect(again.statusCode).toBe(204)
    expect(await database.db.select().from(contentHistory)).toEqual([])
  })

  it.each([
    ['an empty text', { language: 'bn', key: 'home.title', from: null, to: '   ' }],
    ['an untrimmed text', { language: 'bn', key: 'home.title', from: null, to: ' হোম ' }],
    ['a language that is none', { language: 'Bengali', key: 'home.title', from: null, to: 'হোম' }],
    ['a key that is none', { language: 'bn', key: 'home title', from: null, to: 'হোম' }],
    [
      'a text over its limit',
      { language: 'bn', key: 'home.title', from: null, to: 'হ'.repeat(301) },
    ],
  ])('refuse %s, and keep nothing of the save', async (_what, bad) => {
    const server = start()
    const cookie = await admin(server)

    const response = await change(server, cookie, 'screen', [
      { language: 'hi', key: 'home.title', from: null, to: 'होम' },
      bad,
    ])

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
    expect(await database.db.select().from(textOverrides)).toEqual([])
  })

  it('refuse a text changed twice in one save', async () => {
    const server = start()
    const response = await change(server, await admin(server), 'curriculum', [
      { language: 'bn', key: 'week.1.goal', from: null, to: 'এক' },
      { language: 'bn', key: 'week.1.goal', from: null, to: 'দুই' },
    ])

    expect(response.statusCode).toBe(400)
  })

  it('outlive the account of the admin who wrote them', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'languages', languages())
    await change(server, cookie, 'screen', [
      { language: 'bn', key: 'home.title', from: null, to: 'হোম' },
    ])

    await database.db.delete(users).where(eq(users.email, 'admin@example.com'))

    const { settings, texts } = await everything(server)
    expect(settings.languages).toEqual(languages())
    expect(texts.screen).toEqual({ bn: { 'home.title': 'হোম' } })
  })
})
