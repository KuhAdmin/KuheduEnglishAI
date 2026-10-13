import {
  apiErrorSchema,
  LEARNER_PHOTO_MAX,
  learnerDataSchema,
  learnerPhotoSchema,
  learnerProfileSchema,
  type LearnerData,
  type PlacementResult,
  type PlacementSession,
} from '@kuhedu/contracts'
import { eq } from 'drizzle-orm'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildApp, type App, type AppServices } from '../src/app.ts'
import {
  learnerPhotos,
  learnerProfiles,
  lessonMarks,
  placementResponses,
  placementResults,
  placementSessions,
  users,
} from '../src/db/schema/index.ts'
import type { Mail } from '../src/lib/mailer.ts'
import { isPicture } from '../src/modules/me/service.ts'
import { openTestDatabase, type TestDatabase } from './helpers/testDatabase.ts'

// Needs the database: runs against `<PGDATABASE>_test` (see helpers/testDatabase.ts).

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
      authRequestsPerMinute: 1000,
      meRequestsPerMinute: 1000,
      ...overrides,
    },
  })
  return app
}

const cookieOf = (response: { cookies: { name: string; value: string }[] }) =>
  response.cookies.find(({ name }) => name === COOKIE)?.value ?? ''

const lastCode = () => /\b\d{6}\b/.exec(outbox.at(-1)?.text ?? '')?.[0] ?? ''

/** A browser signed up with an address; its code is not entered yet. */
async function signedUp(server: App, email: string) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-up',
    payload: { email, password: PASSWORD },
  })
  expect(response.statusCode).toBe(201)
  return cookieOf(response)
}

/** A learner with an account: signed up, and the emailed code matched. */
async function learner(server: App, email = 'asha@example.com') {
  const cookie = await signedUp(server, email)
  const verified = await server.inject({
    method: 'POST',
    url: '/api/auth/verify-email',
    payload: { code: lastCode() },
    headers: { cookie: `${COOKIE}=${cookie}` },
  })
  expect(verified.statusCode).toBe(204)
  return cookie
}

type Method = 'GET' | 'PATCH' | 'PUT' | 'POST' | 'DELETE'

const ask = (server: App, method: Method, path: string, cookie?: string, payload?: object) =>
  server.inject({
    method,
    url: `/api/me${path}`,
    payload,
    headers: cookie ? { cookie: `${COOKIE}=${cookie}` } : undefined,
  })

const mine = async (server: App, cookie: string): Promise<LearnerData> => {
  const response = await ask(server, 'GET', '', cookie)
  expect(response.statusCode).toBe(200)
  return learnerDataSchema.parse(response.json())
}

const errorOf = (response: { json: () => unknown }) => apiErrorSchema.parse(response.json()).error

// The smallest pictures there are: one pixel of PNG, and the first bytes of the other two kinds.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const JPEG = `data:image/jpeg;base64,${Buffer.from('ffd8ffe000104a46494600010100000100010000', 'hex').toString('base64')}`
const WEBP = `data:image/webp;base64,${Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4, 1), Buffer.from('WEBPVP8 '), Buffer.alloc(8)]).toString('base64')}`

const NOTHING_YET: LearnerData = {
  profile: {
    language: null,
    ageGroup: null,
    tutorAvatar: null,
    theme: null,
    voices: {},
    photoUpdatedAt: null,
  },
  progress: { heardWeeks: [], doneDays: {}, reviewParts: {}, scenariosDone: {} },
  placement: { session: null, result: null },
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

describe('what is kept of a learner', () => {
  it('is nothing at all for a new account', async () => {
    const server = start()

    expect(await mine(server, await learner(server))).toEqual(NOTHING_YET)
  })

  it.each([
    ['GET', ''],
    ['PATCH', '/profile'],
    ['GET', '/photo'],
    ['PUT', '/photo'],
    ['DELETE', '/photo'],
    ['POST', '/progress/marks'],
    ['PUT', '/placement/sessions/PL-1'],
  ] as const)('is for an account with a verified address: %s %s', async (method, path) => {
    const server = start()

    const nobody = await ask(server, method, path)
    expect(nobody.statusCode).toBe(401)
    expect(errorOf(nobody).code).toBe('unauthenticated')

    const unfinished = await ask(server, method, path, await signedUp(server, 'new@example.com'))
    expect(unfinished.statusCode).toBe(403)
    expect(errorOf(unfinished).code).toBe('forbidden')
    expect(await database.db.select().from(learnerProfiles)).toEqual([])
  })

  it('is each learner’s own: nothing of one is given to another', async () => {
    const server = start()
    const asha = await learner(server, 'asha@example.com')
    const ravi = await learner(server, 'ravi@example.com')

    await ask(server, 'PATCH', '/profile', asha, { language: 'bn', theme: 'sage-dusk' })
    await ask(server, 'PUT', '/photo', asha, { photo: PNG })
    await ask(server, 'POST', '/progress/marks', asha, {
      marks: [{ week: 1, kind: 'day', ref: '1' }],
    })
    await ask(server, 'PUT', '/placement/sessions/PL-A', asha, {
      session: test('PL-A'),
      result: null,
    })

    expect(await mine(server, ravi)).toEqual(NOTHING_YET)
    expect((await ask(server, 'GET', '/photo', ravi)).statusCode).toBe(404)
  })

  it('goes with the account when it is deleted', async () => {
    const server = start()
    const cookie = await learner(server)
    await ask(server, 'PATCH', '/profile', cookie, { language: 'hi' })
    await ask(server, 'PUT', '/photo', cookie, { photo: PNG })
    await ask(server, 'POST', '/progress/marks', cookie, {
      marks: [{ week: 1, kind: 'heard', ref: '' }],
    })
    await ask(server, 'PUT', '/placement/sessions/PL-A', cookie, finished('PL-A'))

    await database.db.delete(users).where(eq(users.email, 'asha@example.com'))

    for (const table of [
      learnerProfiles,
      learnerPhotos,
      lessonMarks,
      placementSessions,
      placementResponses,
      placementResults,
    ]) {
      expect(await database.db.select().from(table)).toEqual([])
    }
  })

  it('turns away a learner who asks for more than their share', async () => {
    const server = start({ meRequestsPerMinute: 2 })
    const cookie = await learner(server)

    await ask(server, 'GET', '', cookie)
    await ask(server, 'GET', '', cookie)
    const third = await ask(server, 'GET', '', cookie)

    expect(third.statusCode).toBe(429)
    expect(errorOf(third).code).toBe('rate_limited')
  })
})

describe('PATCH /api/me/profile', () => {
  it('keeps the answers given, and leaves the others as they were', async () => {
    const server = start()
    const cookie = await learner(server)

    const first = await ask(server, 'PATCH', '/profile', cookie, {
      language: 'bn',
      ageGroup: 'teen',
      tutorAvatar: 'female',
    })
    expect(first.statusCode).toBe(200)
    expect(learnerProfileSchema.parse(first.json())).toMatchObject({
      language: 'bn',
      ageGroup: 'teen',
      tutorAvatar: 'female',
      theme: null,
      voices: {},
    })

    const second = await ask(server, 'PATCH', '/profile', cookie, {
      theme: 'midnight-iris',
      voices: { en: { female: 'af_heart' }, hi: { male: 'hm_omega' } },
    })
    expect(second.json()).toMatchObject({
      language: 'bn',
      ageGroup: 'teen',
      tutorAvatar: 'female',
      theme: 'midnight-iris',
      voices: { en: { female: 'af_heart' }, hi: { male: 'hm_omega' } },
    })
    expect((await mine(server, cookie)).profile).toEqual(second.json())
    // One row, however many times it is changed.
    expect(await database.db.select().from(learnerProfiles)).toHaveLength(1)
  })

  it('takes a later answer in place of an earlier one, and an answer taken back', async () => {
    const server = start()
    const cookie = await learner(server)
    await ask(server, 'PATCH', '/profile', cookie, { language: 'bn', theme: 'sage-dusk' })

    const changed = await ask(server, 'PATCH', '/profile', cookie, { language: 'hi', theme: null })

    expect(changed.json()).toMatchObject({ language: 'hi', theme: null })
  })

  it.each([
    ['nothing at all', {}],
    ['a language that is no language tag', { language: 'Bengali!' }],
    ['an age group there is not', { ageGroup: 'elder' }],
    ['a tutor there is not', { tutorAvatar: 'robot' }],
    ['a theme that is not written as one', { theme: 'Sage Dusk' }],
    ['a voice that is not written as one', { voices: { en: { female: 'Google UK English' } } }],
    ['voices under what is no language', { voices: { english: { female: 'af_heart' } } }],
  ])('refuses %s, and keeps nothing', async (_, payload) => {
    const server = start()
    const cookie = await learner(server)

    const response = await ask(server, 'PATCH', '/profile', cookie, payload)

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
    expect(await database.db.select().from(learnerProfiles)).toEqual([])
  })
})

describe('a learner’s photo', () => {
  it.each([
    ['PNG', PNG],
    ['JPEG', JPEG],
    ['WebP', WEBP],
  ])('is kept and given back as it was sent: %s', async (_, photo) => {
    const server = start()
    const cookie = await learner(server)

    const saved = await ask(server, 'PUT', '/photo', cookie, { photo })
    expect(saved.statusCode).toBe(200)
    const { photoUpdatedAt } = saved.json<{ photoUpdatedAt: string }>()

    // A profile says when the photo was saved, and never carries the photo.
    const { profile } = await mine(server, cookie)
    expect(profile.photoUpdatedAt).toBe(photoUpdatedAt)
    expect(JSON.stringify(profile)).not.toContain('data:image')
    const kept = await ask(server, 'GET', '/photo', cookie)
    expect(learnerPhotoSchema.parse(kept.json())).toEqual({ photo })
  })

  it('is replaced by a later one, and gone once removed', async () => {
    const server = start()
    const cookie = await learner(server)
    const first = (await ask(server, 'PUT', '/photo', cookie, { photo: PNG })).json<{
      photoUpdatedAt: string
    }>()

    const second = (await ask(server, 'PUT', '/photo', cookie, { photo: JPEG })).json<{
      photoUpdatedAt: string
    }>()
    expect(Date.parse(second.photoUpdatedAt)).toBeGreaterThanOrEqual(
      Date.parse(first.photoUpdatedAt),
    )
    expect((await ask(server, 'GET', '/photo', cookie)).json()).toEqual({ photo: JPEG })
    expect(await database.db.select().from(learnerPhotos)).toHaveLength(1)

    expect((await ask(server, 'DELETE', '/photo', cookie)).statusCode).toBe(204)
    const gone = await ask(server, 'GET', '/photo', cookie)
    expect(gone.statusCode).toBe(404)
    expect(errorOf(gone).code).toBe('not_found')
    expect((await mine(server, cookie)).profile.photoUpdatedAt).toBeNull()
    // Removing what is not there is no failure.
    expect((await ask(server, 'DELETE', '/photo', cookie)).statusCode).toBe(204)
  })

  it.each([
    ['a drawing that can carry a script', 'data:image/svg+xml;base64,PHN2Zy8+'],
    ['an address', 'https://example.com/me.png'],
    ['what says it is a PNG and is not', `data:image/png;base64,${btoa('not a picture at all')}`],
    ['a JPEG sent as a PNG', JPEG.replace('jpeg', 'png')],
    ['a picture too heavy to keep', `${PNG.slice(0, -2)}${'A'.repeat(LEARNER_PHOTO_MAX)}==`],
  ])('refuses %s', async (_, photo) => {
    const server = start()
    const cookie = await learner(server)

    const response = await ask(server, 'PUT', '/photo', cookie, { photo })

    expect([400, 413]).toContain(response.statusCode)
    expect(errorOf(response).code).toBe('validation_failed')
    expect(await database.db.select().from(learnerPhotos)).toEqual([])
  })

  it('tells a picture by how it begins, not by what it is called', () => {
    expect(isPicture(PNG)).toBe(true)
    expect(isPicture(JPEG)).toBe(true)
    expect(isPicture(WEBP)).toBe(true)
    expect(isPicture(WEBP.replace('webp', 'jpeg'))).toBe(false)
    expect(isPicture('data:image/png;base64,')).toBe(false)
  })
})

describe('POST /api/me/progress/marks', () => {
  const marks = [
    { week: 1, kind: 'heard', ref: '' },
    { week: 1, kind: 'day', ref: '2' },
    { week: 1, kind: 'day', ref: '1' },
    { week: 1, kind: 'review_part', ref: 'roleplay' },
    { week: 1, kind: 'review_part', ref: 'quiz' },
    { week: 1, kind: 'scenario', ref: '2' },
    { week: 1, kind: 'scenario', ref: '0' },
    { week: 3, kind: 'day', ref: '7' },
  ]

  it('adds what was done, and gives it back as the app keeps it', async () => {
    const server = start()
    const cookie = await learner(server)

    expect((await ask(server, 'POST', '/progress/marks', cookie, { marks })).statusCode).toBe(204)

    expect((await mine(server, cookie)).progress).toEqual({
      heardWeeks: [1],
      doneDays: { 1: [1, 2], 3: [7] },
      // In the order the review lists its parts, whatever order they were done in.
      reviewParts: { 1: ['quiz', 'roleplay'] },
      scenariosDone: { 1: [0, 2] },
    })
  })

  it('changes nothing when a mark is sent again, alone or among new ones', async () => {
    const server = start()
    const cookie = await learner(server)
    await ask(server, 'POST', '/progress/marks', cookie, { marks })
    const [before] = await database.db.select().from(lessonMarks).where(eq(lessonMarks.week, 3))

    const again = await ask(server, 'POST', '/progress/marks', cookie, {
      marks: [...marks, { week: 2, kind: 'heard', ref: '' }],
    })

    expect(again.statusCode).toBe(204)
    expect(await database.db.select().from(lessonMarks)).toHaveLength(marks.length + 1)
    expect((await mine(server, cookie)).progress.heardWeeks).toEqual([1, 2])
    // And it keeps the time it was first done.
    const [after] = await database.db.select().from(lessonMarks).where(eq(lessonMarks.week, 3))
    expect(after?.completedAt).toEqual(before?.completedAt)
  })

  it.each([
    ['no marks', []],
    ['a week the course does not have', [{ week: 51, kind: 'heard', ref: '' }]],
    ['an eighth day', [{ week: 1, kind: 'day', ref: '8' }]],
    ['a day for what was only heard', [{ week: 1, kind: 'heard', ref: '1' }]],
    ['a part the review does not have', [{ week: 1, kind: 'review_part', ref: 'essay' }]],
    ['a fourth scenario', [{ week: 1, kind: 'scenario', ref: '3' }]],
    ['a kind of mark there is not', [{ week: 1, kind: 'streak', ref: '' }]],
    ['more marks than one request may carry', Array(201).fill({ week: 1, kind: 'heard', ref: '' })],
  ])('refuses %s, and adds nothing', async (_, sent) => {
    const server = start()
    const cookie = await learner(server)

    const response = await ask(server, 'POST', '/progress/marks', cookie, { marks: sent })

    expect(response.statusCode).toBe(400)
    expect(await database.db.select().from(lessonMarks)).toEqual([])
  })
})

/** A question answered, as the app records it. */
const answered = (itemId: string, at: string): PlacementSession['responses'][number] => ({
  itemId,
  stage: 'LISTEN',
  level: 'A1',
  answeredAt: at,
  timeTakenMs: 4200.5,
  answer: 2,
  correct: true,
  skipped: null,
  playCount: 1,
  slowPlayCount: 0,
  helpOpened: false,
  transcriptShown: false,
  translationOffered: false,
  translationUsed: false,
  modelPlayed: false,
  recordingAttempts: 0,
  recordingDurationMs: 0,
})

/** A test under way, as the app keeps it. */
const test = (id: string, changes: Partial<PlacementSession> = {}): PlacementSession => ({
  id,
  version: '2026-10',
  status: 'IN_PROGRESS',
  startedAt: '2026-10-13T08:00:00.000Z',
  updatedAt: '2026-10-13T08:01:00.000Z',
  completedAt: null,
  languageSupport: 'bn',
  deviceType: 'mobile',
  stage: 'LISTEN',
  stageStarted: true,
  currentItemId: 'L-A1-02',
  responses: [answered('L-A1-01', '2026-10-13T08:01:00.000Z')],
  notAssessed: {},
  ...changes,
})

const outcome = (sessionId: string, completedAt: string): PlacementResult => ({
  sessionId,
  version: '2026-10',
  completedAt,
  profile: {
    listening: { status: 'assessed', level: 'A2', confidence: 'medium' },
    understanding: { status: 'assessed', level: 'A1', confidence: 'high' },
    speaking: { status: 'notAssessed', reason: 'notScoredYet' },
    understandBreakdown: {
      vocabulary: { correct: 1, attempted: 2 },
      meaning: { correct: 1, attempted: 1 },
      grammar: { correct: 0, attempted: 1 },
      functional: { correct: 1, attempted: 1 },
    },
    dependency: { translation: 0.5, replay: 0.25, help: null },
    speakingAttempts: 2,
  },
  recommendation: {
    startLevel: 'A1',
    supportLevel: 'MEDIUM',
    prioritySkills: ['understanding', 'speaking'],
    provisional: true,
  },
})

/** A test taken to its end, with what it came to. */
const finished = (id: string, completedAt = '2026-10-13T08:10:00.000Z') => ({
  session: test(id, {
    status: 'COMPLETED',
    stage: 'SPEAK',
    currentItemId: null,
    updatedAt: completedAt,
    completedAt,
    notAssessed: { SPEAK: 'notScoredYet' },
    responses: [
      answered('L-A1-01', '2026-10-13T08:01:00.000Z'),
      answered('L-A2-03', '2026-10-13T08:02:00.000Z'),
    ],
  }),
  result: outcome(id, completedAt),
})

describe('PUT /api/me/placement/sessions/:clientId', () => {
  const save = (server: App, cookie: string, id: string, payload: object) =>
    ask(server, 'PUT', `/placement/sessions/${id}`, cookie, payload)

  it('keeps a test as it stands, and gives it back as the app keeps it', async () => {
    const server = start()
    const cookie = await learner(server)
    const session = test('PL-20261013-8F42A')

    const saved = await save(server, cookie, session.id, { session, result: null })

    expect(saved.statusCode).toBe(204)
    expect((await mine(server, cookie)).placement).toEqual({ session, result: null })
  })

  it('takes a later save of the same test in place of the earlier one', async () => {
    const server = start()
    const cookie = await learner(server)
    await save(server, cookie, 'PL-A', { session: test('PL-A'), result: null })

    const later = test('PL-A', {
      status: 'PAUSED',
      stage: 'UNDERSTAND',
      updatedAt: '2026-10-13T08:05:00.000Z',
      currentItemId: 'U-A1-01',
      notAssessed: { LISTEN: 'audioUnavailable' },
      responses: [
        answered('L-A1-01', '2026-10-13T08:01:00.000Z'),
        {
          ...answered('L-A1-02', '2026-10-13T08:02:00.000Z'),
          answer: null,
          correct: null,
          skipped: 'audioFailed',
        },
      ],
    })
    expect((await save(server, cookie, 'PL-A', { session: later, result: null })).statusCode).toBe(
      204,
    )

    expect((await mine(server, cookie)).placement.session).toEqual(later)
    expect(await database.db.select().from(placementSessions)).toHaveLength(1)
    expect(await database.db.select().from(placementResponses)).toHaveLength(2)
  })

  it('keeps what a finished test came to, and does not reopen it', async () => {
    const server = start()
    const cookie = await learner(server)
    await save(server, cookie, 'PL-A', { session: test('PL-A'), result: null })
    const done = finished('PL-A')

    expect((await save(server, cookie, 'PL-A', done)).statusCode).toBe(204)
    expect((await mine(server, cookie)).placement).toEqual(done)

    // Sent again by a phone that did not hear the answer: the same, and no failure.
    expect((await save(server, cookie, 'PL-A', done)).statusCode).toBe(204)
    expect(await database.db.select().from(placementResults)).toHaveLength(1)

    const reopened = await save(server, cookie, 'PL-A', { session: test('PL-A'), result: null })
    expect(reopened.statusCode).toBe(409)
    expect(errorOf(reopened).code).toBe('conflict')
    expect((await mine(server, cookie)).placement).toEqual(done)
  })

  it('gives the test last touched, with the outcome of the one last finished', async () => {
    const server = start()
    const cookie = await learner(server)
    const first = finished('PL-A')
    await save(server, cookie, 'PL-A', first)

    // They start the test again: until it is finished, their level is the first one's.
    const again = test('PL-B', {
      startedAt: '2026-10-14T09:00:00.000Z',
      updatedAt: '2026-10-14T09:01:00.000Z',
    })
    await save(server, cookie, 'PL-B', { session: again, result: null })

    expect((await mine(server, cookie)).placement).toEqual({ session: again, result: first.result })
  })

  it.each([
    [
      'a test under another id than the address says',
      'PL-A',
      { session: test('PL-B'), result: null },
    ],
    [
      'a finished test that does not say when',
      'PL-A',
      { ...finished('PL-A'), session: { ...finished('PL-A').session, completedAt: null } },
    ],
    [
      'a result for a test that is not finished',
      'PL-A',
      { session: test('PL-A'), result: outcome('PL-A', '2026-10-13T08:10:00.000Z') },
    ],
    [
      'a result that is another test’s',
      'PL-A',
      { ...finished('PL-A'), result: outcome('PL-B', '2026-10-13T08:10:00.000Z') },
    ],
    [
      'a time that is not one',
      'PL-A',
      { session: test('PL-A', { updatedAt: 'yesterday' }), result: null },
    ],
    [
      'a language that is not one',
      'PL-A',
      { session: test('PL-A', { languageSupport: 'Bengali!' }), result: null },
    ],
    ['an id with more than letters in it', 'PL A', { session: test('PL A'), result: null }],
  ])('refuses %s, and keeps nothing', async (_, id, payload) => {
    const server = start()
    const cookie = await learner(server)

    const response = await save(server, cookie, encodeURIComponent(id), payload)

    expect(response.statusCode).toBe(400)
    expect(errorOf(response).code).toBe('validation_failed')
    expect(await database.db.select().from(placementSessions)).toEqual([])
  })
})
