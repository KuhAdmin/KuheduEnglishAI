import {
  apiErrorSchema,
  storedLessonsSchema,
  WEEK_CONTENT_KINDS,
  weekLessonsSchema,
} from '@kuhedu/contracts'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp, type App, type AppServices } from '../src/app.ts'
import { auditLog, contentHistory, users, weekContent } from '../src/db/schema/index.ts'
import type { Mail } from '../src/lib/mailer.ts'
import { removePiece, savePiece } from '../src/modules/content/lessons.ts'
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
      lessonRequestsPerMinute: 1000,
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
  // Nobody becomes an admin by signing up: the command that makes one writes the role.
  if (role === 'admin') {
    await database.db.update(users).set({ role }).where(eq(users.email, email))
  }
  return cookie
}

const admin = (server: App) => signedIn(server, 'admin@example.com', 'admin')

const asWho = (cookie?: string) => (cookie ? { cookie: `${COOKIE}=${cookie}` } : undefined)

const week = async (server: App, number = 1, headers?: Record<string, string>) =>
  server.inject({ method: 'GET', url: `/api/lessons/weeks/${number}`, headers })

const contentOf = async (server: App, number = 1) =>
  weekLessonsSchema.parse((await week(server, number)).json()).content

const save = (
  server: App,
  cookie: string | undefined,
  kind: string,
  value: unknown,
  version = 0,
  number = 1,
) =>
  server.inject({
    method: 'PUT',
    url: `/api/admin/lessons/weeks/${number}/${kind}`,
    payload: { value, version },
    headers: asWho(cookie),
  })

const remove = (server: App, cookie: string | undefined, kind: string, version: number) =>
  server.inject({
    method: 'DELETE',
    url: `/api/admin/lessons/weeks/1/${kind}?version=${version}`,
    headers: asWho(cookie),
  })

const errorOf = (response: { json: () => unknown }) => apiErrorSchema.parse(response.json()).error

/** A conversation as an editor sends it. */
const greeting = (second = 'Good morning!') => ({
  videoUrl: null,
  lines: [
    { speaker: 'Asha', text: 'Hello!', translations: { bn: 'হ্যালো!', hi: 'नमस्ते!' } },
    { speaker: 'Ravi', text: second, translations: {} },
  ],
  voices: { Asha: 'female', Ravi: 'male' },
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

describe('GET /api/lessons/weeks/:week', () => {
  it('answers anyone, with nothing for a week nobody has written', async () => {
    const server = start()

    const response = await week(server)

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      week: 1,
      content: Object.fromEntries(WEEK_CONTENT_KINDS.map((kind) => [kind, null])),
    })
  })

  it('gives what is kept for the week, and only for that week', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())
    await save(server, cookie, 'review_dialogue', greeting('Good evening!'))
    await save(server, cookie, 'picture', '/pictures/week-1.webp')
    await save(server, cookie, 'dialogue', greeting('Good afternoon!'), 0, 2)

    const first = await contentOf(server, 1)
    expect(first.dialogue).toEqual(greeting())
    expect(first.review_dialogue?.lines[1]?.text).toBe('Good evening!')
    expect(first.picture).toBe('/pictures/week-1.webp')
    expect(first.vocabulary).toBeNull()
    expect((await contentOf(server, 2)).dialogue?.lines[1]?.text).toBe('Good afternoon!')
    expect((await contentOf(server, 3)).dialogue).toBeNull()
  })

  it('lets a browser keep its answer and ask whether it still stands', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())

    const first = await week(server)
    const etag = String(first.headers.etag)
    expect(first.headers['cache-control']).toBe('no-cache')
    expect(etag).toMatch(/^"week-1-/)

    const again = await week(server, 1, { 'if-none-match': etag })
    expect(again.statusCode).toBe(304)
    expect(again.body).toBe('')

    // An admin changes the week: the answer the browser has no longer stands.
    await save(server, cookie, 'dialogue', greeting('Good evening!'), 1)
    const after = await week(server, 1, { 'if-none-match': etag })
    expect(after.statusCode).toBe(200)
    expect(after.headers.etag).not.toBe(etag)
  })

  it.each(['0', '51', 'one', '1.5'])('has no week %s', async (number) => {
    const response = await start().inject({ method: 'GET', url: `/api/lessons/weeks/${number}` })

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
  })

  it('turns away an address that asks for more than its share', async () => {
    const server = start({ lessonRequestsPerMinute: 2 })

    await week(server)
    await week(server)
    const third = await week(server)

    expect(third.statusCode).toBe(429)
    expect(errorOf(third).code).toBe('rate_limited')
  })
})

describe('what an admin writes for a week', () => {
  it.each([
    ['PUT', '/weeks/1/dialogue'],
    ['DELETE', '/weeks/1/dialogue?version=1'],
    ['GET', ''],
  ] as const)('is an admin’s alone to write and to list: %s %s', async (method, path) => {
    const server = start()
    const ask = (cookie?: string) =>
      server.inject({
        method,
        url: `/api/admin/lessons${path}`,
        payload: method === 'PUT' ? { value: greeting(), version: 0 } : undefined,
        headers: asWho(cookie),
      })

    const nobody = await ask()
    expect(nobody.statusCode).toBe(401)
    expect(errorOf(nobody).code).toBe('unauthenticated')

    const learner = await ask(await signedIn(server, 'asha@example.com'))
    expect(learner.statusCode).toBe(403)
    expect(errorOf(learner).code).toBe('forbidden')
    expect(await database.db.select().from(weekContent)).toEqual([])
  })

  it('is kept as the screens will read it, and counted from its first save', async () => {
    const server = start()
    const cookie = await admin(server)

    const saved = await save(server, cookie, 'dialogue', {
      ...greeting(),
      // What no conversation has, and a line nobody says: neither is kept.
      mood: 'cheerful',
      lines: [...greeting().lines, { speaker: '', text: 'Nobody says this.' }],
    })

    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toEqual({ version: 1 })
    const [row] = await database.db.select().from(weekContent)
    expect(row).toMatchObject({ kind: 'dialogue', week: 1, version: 1, value: greeting() })
    expect(row?.updatedBy).not.toBeNull()
  })

  it('takes a later save in place of an earlier one, and keeps what it replaced', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())

    const later = await save(server, cookie, 'dialogue', greeting('Good evening!'), 1)

    expect(later.json()).toEqual({ version: 2 })
    expect((await contentOf(server)).dialogue).toEqual(greeting('Good evening!'))
    const history = await database.db.select().from(contentHistory)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      source: 'week_content',
      ref: 'dialogue/1',
      version: 1,
      value: greeting(),
    })
    const log = await database.db.select().from(auditLog)
    expect(log.map(({ action, target, detail }) => [action, target, detail])).toEqual([
      ['week_content.save', 'dialogue/1', { version: 1 }],
      ['week_content.save', 'dialogue/1', { version: 2 }],
    ])
  })

  it('does not write over what another admin saved in between', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())
    await save(server, cookie, 'dialogue', greeting('Good evening!'), 1)

    // Written from the first version, by someone who has not seen the second.
    const stale = await save(server, cookie, 'dialogue', greeting('Good night!'), 1)

    expect(stale.statusCode).toBe(409)
    expect(errorOf(stale).code).toBe('conflict')
    expect((await contentOf(server)).dialogue).toEqual(greeting('Good evening!'))
    // Nor is a first save taken for something that is already there.
    expect((await save(server, cookie, 'dialogue', greeting(), 0)).statusCode).toBe(409)
  })

  it('changes nothing when what is saved is what is already kept', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())

    const same = await save(server, cookie, 'dialogue', greeting(), 1)

    expect(same.json()).toEqual({ version: 1 })
    expect(await database.db.select().from(contentHistory)).toEqual([])
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })

  it.each([
    ['a conversation without a line anyone says', 'dialogue', { videoUrl: null, lines: [] }],
    ['words without a word', 'vocabulary', { words: [{ meanings: { bn: 'হ্যালো' } }] }],
    ['a role-play without a partner', 'roleplay', { turns: [{ partner: 'Hi', reply: 'Hi' }] }],
    ['a picture that is a script', 'picture', 'javascript:alert(1)'],
    ['nothing at all', 'quiz', null],
  ])('refuses %s: there would be nothing to show', async (_, kind, value) => {
    const server = start()

    const response = await save(server, await admin(server), kind, value)

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
    expect(await database.db.select().from(weekContent)).toEqual([])
  })

  it.each([
    ['a kind of content there is not', '/weeks/1/poem'],
    ['a week the course does not have', '/weeks/51/dialogue'],
  ])('has no place for %s', async (_, path) => {
    const server = start()

    const response = await server.inject({
      method: 'PUT',
      url: `/api/admin/lessons${path}`,
      payload: { value: greeting(), version: 0 },
      headers: asWho(await admin(server)),
    })

    expect(response.statusCode).toBe(400)
    expect(await database.db.select().from(weekContent)).toEqual([])
  })

  it('can be removed, which leaves the week to what the app has built in', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())

    // Not on the word of someone who has not seen what is there now.
    expect((await remove(server, cookie, 'dialogue', 7)).statusCode).toBe(409)
    expect((await remove(server, cookie, 'dialogue', 1)).statusCode).toBe(204)

    expect((await contentOf(server)).dialogue).toBeNull()
    expect(await database.db.select().from(contentHistory)).toHaveLength(1)
    // Removing what is not there is no failure.
    expect((await remove(server, cookie, 'dialogue', 1)).statusCode).toBe(204)
    // And it can be written again, from nothing.
    expect((await save(server, cookie, 'dialogue', greeting(), 0)).json()).toEqual({ version: 1 })
  })

  it('is listed whole, with its versions, for the editors to open with', async () => {
    const server = start()
    const cookie = await admin(server)
    await save(server, cookie, 'dialogue', greeting())
    await save(server, cookie, 'dialogue', greeting('Good evening!'), 1)
    await save(server, cookie, 'picture', '/pictures/week-2.webp', 0, 2)

    const listed = await server.inject({
      method: 'GET',
      url: '/api/admin/lessons',
      headers: asWho(cookie),
    })

    expect(storedLessonsSchema.parse(listed.json()).pieces).toEqual([
      { week: 1, kind: 'dialogue', value: greeting('Good evening!'), version: 2 },
      { week: 2, kind: 'picture', value: '/pictures/week-2.webp', version: 1 },
    ])
  })

  it('outlives the account of the admin who wrote it', async () => {
    const server = start()
    await save(server, await admin(server), 'dialogue', greeting())

    await database.db.delete(users).where(eq(users.email, 'admin@example.com'))

    const [row] = await database.db.select().from(weekContent)
    expect(row?.updatedBy).toBeNull()
    expect((await contentOf(server)).dialogue).toEqual(greeting())
  })
})

describe('content put in by a command on the server', () => {
  it('is what the content is to be, whatever version was there', async () => {
    const { db } = database
    expect(await savePiece(db, { week: 2, kind: 'dialogue', value: greeting(), by: null })).toBe(1)
    expect(
      await savePiece(db, { week: 2, kind: 'dialogue', value: greeting('Bye!'), by: null }),
    ).toBe(2)
    // Run again with the same file: nothing to do.
    expect(
      await savePiece(db, { week: 2, kind: 'dialogue', value: greeting('Bye!'), by: null }),
    ).toBe(2)

    await removePiece(db, { week: 2, kind: 'dialogue', by: null })
    expect(await db.select().from(weekContent)).toEqual([])
    expect(await db.select().from(contentHistory)).toHaveLength(2)
  })
})
