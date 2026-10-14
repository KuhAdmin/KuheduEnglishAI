import {
  expect,
  test as base,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'

export { expect }

/** A 1×1 PNG, for uploads and for mocked image URLs. */
export const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

/** A learner with an account, as the server describes whoever is signed in. */
export const LEARNER = {
  id: 'u-learner',
  email: 'learner@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
}

/** What the stand-in server takes as the admin's, and who it then says is signed in. */
export const ADMIN = { email: 'admin@example.com', password: 'the-admin-password' }
const ADMIN_USER = { ...LEARNER, id: 'u-admin', email: ADMIN.email, role: 'admin' }

/**
 * Put a value in localStorage before the app starts — once per browser context, so later
 * changes made through the UI survive reloads and are shared between tabs.
 */
async function seedStorage(target: Page | BrowserContext, key: string, value: unknown) {
  await target.addInitScript(
    ([storageKey, json]) => {
      const marker = `e2e-seeded:${storageKey}`
      if (localStorage.getItem(marker)) return
      localStorage.setItem(marker, '1')
      localStorage.setItem(storageKey, json)
    },
    [key, JSON.stringify(value)] as const,
  )
}

/** Start as a learner who already chose this language. */
export const seedLanguage = (target: Page | BrowserContext, language: string) =>
  seedStorage(target, 'kuhedu-language', { state: { language }, version: 0 })

/** Start as someone who already answered onboarding's question about themselves. */
export const seedAboutThem = (target: Page | BrowserContext, ageGroup = 'adult') =>
  seedStorage(target, 'kuhedu-onboarding', { state: { ageGroup }, version: 0 })

/** Start as someone who has already finished these days of a week's lessons. */
export const seedDaysDone = (target: Page | BrowserContext, week: number, days: number[]) =>
  seedStorage(target, 'kuhedu-lessons', {
    state: { heardWeeks: [], doneDays: { [week]: days }, reviewParts: {}, scenariosDone: {} },
    version: 0,
  })

/**
 * Who the server says is signed in, for a test without one: `null` for nobody, a visitor. What
 * is said last counts, and a page's own answer goes before its browser's.
 */
export const signedInAs = (target: Page | BrowserContext, user: Record<string, unknown> | null) =>
  target.route('**/api/auth/session', (route) => route.fulfill({ json: { user } }))

/**
 * The `test` every spec uses. The app has no guests: a learner's screens open only for someone
 * signed in, so a test starts as a learner with an account, in every tab of its browser. A test
 * about a visitor says so with `signedInAs(page, null)`, one about an admin with `signInAsAdmin`.
 */
export const test = base.extend({
  context: async ({ context }, run) => {
    await signedInAs(context, LEARNER)
    await withoutLearnerServer(context)
    await withoutLessonServer(context)
    await withoutAppConfigServer(context)
    await run(context)
  },
})

/**
 * What a learner sets and does is kept with their account (`/api/me`). A spec has no server
 * behind it, and must not reach a real one (`vite preview` passes `/api` on to a backend if one
 * is running): asked, it does not answer, so the app goes by what the browser holds, as it does
 * offline. This is every spec's start; one about the account's data says `learnerServer`.
 */
export const withoutLearnerServer = (target: Page | BrowserContext) =>
  target.route(/\/api\/me(\/|$|\?)/, (route) => route.abort())

/**
 * The lessons are kept on the server (`/api/lessons`, and `/api/admin/lessons` for an admin). A
 * spec has no server behind it: asked, it does not answer, so a learner's screens run on what is
 * built in and on what the spec seeded, as they do offline. This is every spec's start; an admin
 * (`signInAsAdmin`) gets a stand-in that keeps what they save, and a spec about a learner
 * reading the server says `lessonServer` itself.
 */
export const withoutLessonServer = (target: Page | BrowserContext) =>
  target.route(/\/api\/(admin\/)?lessons(\/|$|\?)/, (route) => route.abort())

/** A piece of a week's lesson content, as the stand-in server keeps it. */
export type KeptPiece = { week: number; kind: string; value: unknown; version: number }

const LESSON_KINDS = [
  'picture',
  'dialogue',
  'vocabulary',
  'sentences',
  'roleplay',
  'challenge',
  'quiz',
  'review_dialogue',
  'review_roleplay',
  'scenarios',
]

/**
 * Stand in for the server's lesson routes: what is kept of every week, in `kept`, which
 * several browsers can be given to share a server. What the real one checks and refuses is its
 * own tests' to say (`server/test/lessons.db.test.ts`).
 */
export async function lessonServer(target: Page | BrowserContext, kept: KeptPiece[] = []) {
  const find = (kind: string, week: number) =>
    kept.find((piece) => piece.kind === kind && piece.week === week)

  await target.route(/\/api\/(admin\/)?lessons(\/|$|\?)/, (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()

    const week = /^\/api\/lessons\/weeks\/(\d+)$/.exec(url.pathname)
    if (week && method === 'GET') {
      const number = Number(week[1])
      const content = Object.fromEntries(
        LESSON_KINDS.map((kind) => [kind, find(kind, number)?.value ?? null]),
      )
      return route.fulfill({ json: { week: number, content } })
    }
    if (url.pathname === '/api/admin/lessons' && method === 'GET') {
      return route.fulfill({ json: { pieces: kept } })
    }

    const piece = /^\/api\/admin\/lessons\/weeks\/(\d+)\/(\w+)$/.exec(url.pathname)
    if (!piece) {
      return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: '' } } })
    }
    const number = Number(piece[1])
    const kind = String(piece[2])
    const there = find(kind, number)
    const sent =
      method === 'PUT' ? (request.postDataJSON() as { value: unknown; version: number }) : null
    const based = sent ? sent.version : Number(url.searchParams.get('version'))
    if (based !== (there?.version ?? 0)) {
      return route.fulfill({ status: 409, json: { error: { code: 'conflict', message: '' } } })
    }
    if (there) kept.splice(kept.indexOf(there), 1)
    if (!sent) return route.fulfill({ status: 204 })
    const version = (there?.version ?? 0) + 1
    kept.push({ week: number, kind, value: sent.value, version })
    return route.fulfill({ json: { version } })
  })
}

/**
 * Everything else an admin manages is kept on the server too (`/api/app-config`, and
 * `/api/admin/app-config` for an admin). Asked, it does not answer, so the screens run on what
 * is built in and on what the spec seeded (`seedSettings`), as they do offline. This is every
 * spec's start; an admin (`signInAsAdmin`) gets a stand-in that keeps what they save, and a
 * spec about a learner reading the server says `appConfigServer` itself.
 */
export const withoutAppConfigServer = (target: Page | BrowserContext) =>
  target.route(/\/api\/(admin\/)?app-config(\/|$|\?)/, (route) => route.abort())

type Texts = Record<string, Record<string, string>>

/** The settings an admin wrote, as the stand-in server keeps them. */
export type KeptSettings = {
  settings: Record<string, { value: unknown; version: number }>
  texts: { screen: Texts; curriculum: Texts }
}

export const noSettings = (): KeptSettings => ({
  settings: {},
  texts: { screen: {}, curriculum: {} },
})

/**
 * Stand in for the server's settings routes: what is kept in `kept`, which several browsers can
 * be given to share a server. What the real one checks and refuses is its own tests' to say
 * (`server/test/appConfig.db.test.ts`).
 */
export async function appConfigServer(
  target: Page | BrowserContext,
  kept: KeptSettings = noSettings(),
) {
  const conflict = { status: 409, json: { error: { code: 'conflict', message: '' } } }

  await target.route(/\/api\/(admin\/)?app-config(\/|$|\?)/, (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const method = request.method()
    const path = url.pathname.replace(/\/$/, '')

    if (path === '/api/app-config' && method === 'GET') {
      const settings = Object.fromEntries(
        ['landing', 'languages', 'learner-profiles'].map((name) => [
          name,
          kept.settings[name]?.value ?? null,
        ]),
      )
      return route.fulfill({ json: { settings, texts: kept.texts } })
    }
    if (path === '/api/admin/app-config' && method === 'GET') {
      const settings = Object.entries(kept.settings).map(([name, held]) => ({ name, ...held }))
      return route.fulfill({ json: { settings, texts: kept.texts } })
    }

    const scope = /^\/api\/admin\/app-config\/texts\/(screen|curriculum)$/.exec(path)?.[1]
    if ((scope === 'screen' || scope === 'curriculum') && method === 'PATCH') {
      const texts = kept.texts[scope]
      const { changes } = request.postDataJSON() as {
        changes: { language: string; key: string; from: string | null; to: string | null }[]
      }
      const stale = changes.some(
        ({ language, key, from, to }) =>
          (texts[language]?.[key] ?? null) !== from && (texts[language]?.[key] ?? null) !== to,
      )
      if (stale) return route.fulfill(conflict)
      for (const { language, key, to } of changes) {
        if (to === null) delete texts[language]?.[key]
        else (texts[language] ??= {})[key] = to
      }
      return route.fulfill({ status: 204 })
    }

    const whole = /^\/api\/admin\/app-config\/([\w-]+)$/.exec(path)
    if (!whole || (method !== 'PUT' && method !== 'DELETE')) {
      return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: '' } } })
    }
    const name = String(whole[1])
    const there = kept.settings[name]
    const sent =
      method === 'PUT' ? (request.postDataJSON() as { value: unknown; version: number }) : null
    const based = sent ? sent.version : Number(url.searchParams.get('version'))
    if (based !== (there?.version ?? 0)) return route.fulfill(conflict)
    if (!sent) {
      kept.settings = Object.fromEntries(
        Object.entries(kept.settings).filter(([other]) => other !== name),
      )
      return route.fulfill({ status: 204 })
    }
    const version = (there?.version ?? 0) + 1
    kept.settings[name] = { value: sent.value, version }
    return route.fulfill({ json: { version } })
  })
}

/** What an account holds of its learner, as the stand-in server keeps it between browsers. */
export type KeptOfLearner = {
  profile: Record<string, unknown>
  marks: { week: number; kind: string; ref: string }[]
  placement: { session: unknown; result: unknown }
  photo: { photo: string; photoUpdatedAt: string } | null
}

export const nothingKept = (): KeptOfLearner => ({
  profile: {},
  marks: [],
  placement: { session: null, result: null },
  photo: null,
})

const REVIEW_PARTS = ['quiz', 'listening', 'speaking', 'flashcards', 'roleplay']

/** The marks as the app's store keeps progress, which is how the server answers with them. */
function progressOf(marks: KeptOfLearner['marks']) {
  const byWeek = (kind: string) => {
    const weeks: Record<string, string[]> = {}
    for (const mark of marks) if (mark.kind === kind) (weeks[mark.week] ??= []).push(mark.ref)
    return weeks
  }
  const numbers = (weeks: Record<string, string[]>) =>
    Object.fromEntries(
      Object.entries(weeks).map(([week, refs]) => [week, refs.map(Number).sort((a, b) => a - b)]),
    )
  return {
    heardWeeks: marks.filter((mark) => mark.kind === 'heard').map((mark) => mark.week),
    doneDays: numbers(byWeek('day')),
    reviewParts: Object.fromEntries(
      Object.entries(byWeek('review_part')).map(([week, parts]) => [
        week,
        REVIEW_PARTS.filter((part) => parts.includes(part)),
      ]),
    ),
    scenariosDone: numbers(byWeek('scenario')),
  }
}

/**
 * Stand in for the server's `/api/me` routes: what is kept of one learner, in `kept`, which
 * several browsers can be given to share an account. What the real server checks and refuses is
 * its own tests' to say (`server/test/me.db.test.ts`).
 */
export async function learnerServer(target: Page | BrowserContext, kept: KeptOfLearner) {
  await target.route(/\/api\/me(\/|$|\?)/, (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace(/^.*\/api\/me/, '')
    const method = request.method()
    const profile = () => ({
      language: null,
      ageGroup: null,
      tutorAvatar: null,
      theme: null,
      voices: {},
      ...kept.profile,
      photoUpdatedAt: kept.photo?.photoUpdatedAt ?? null,
    })

    if (path === '' && method === 'GET') {
      return route.fulfill({
        json: { profile: profile(), progress: progressOf(kept.marks), placement: kept.placement },
      })
    }
    if (path === '/profile' && method === 'PATCH') {
      Object.assign(kept.profile, request.postDataJSON())
      return route.fulfill({ json: profile() })
    }
    if (path === '/progress/marks' && method === 'POST') {
      const { marks } = request.postDataJSON() as { marks: KeptOfLearner['marks'] }
      for (const mark of marks) {
        const there = kept.marks.some(
          (other) => other.week === mark.week && other.kind === mark.kind && other.ref === mark.ref,
        )
        if (!there) kept.marks.push(mark)
      }
      return route.fulfill({ status: 204 })
    }
    if (path.startsWith('/placement/sessions/') && method === 'PUT') {
      kept.placement = request.postDataJSON() as KeptOfLearner['placement']
      return route.fulfill({ status: 204 })
    }
    if (path === '/photo' && method === 'PUT') {
      const { photo } = request.postDataJSON() as { photo: string }
      kept.photo = { photo, photoUpdatedAt: new Date().toISOString() }
      return route.fulfill({ json: { photoUpdatedAt: kept.photo.photoUpdatedAt } })
    }
    if (path === '/photo' && method === 'DELETE') {
      kept.photo = null
      return route.fulfill({ status: 204 })
    }
    if (path === '/photo' && method === 'GET' && kept.photo) {
      return route.fulfill({ json: { photo: kept.photo.photo } })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: path } } })
  })
}

/**
 * The server's account routes for a learner who is signed in until they sign out: nobody after.
 */
export async function learnerSession(target: Page | BrowserContext) {
  let user: typeof LEARNER | null = LEARNER
  await target.route('**/api/auth/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/auth', '')
    if (path === '/session') return route.fulfill({ json: { user } })
    if (path === '/sign-out') {
      user = null
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: path } } })
  })
}

/** Start with settings an admin saved earlier. */
export const seedSettings = (target: Page | BrowserContext, name: string, value: unknown) =>
  seedStorage(target, `kuhedu-settings:${name}`, value)

/**
 * The server's account routes, as far as an admin signing in and out needs them: nobody is
 * signed in until the admin's own address and password are given, and nobody after signing out.
 * What the real server does is its own tests' to say.
 */
export async function adminServer(target: Page | BrowserContext) {
  let user: typeof ADMIN_USER | null = null
  await target.route('**/api/auth/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/auth', '')
    if (path === '/session') return route.fulfill({ json: { user } })
    if (path === '/sign-in') {
      const given = route.request().postDataJSON() as { email?: string; password?: string }
      if (given.email !== ADMIN.email || given.password !== ADMIN.password) {
        return route.fulfill({
          status: 401,
          json: { error: { code: 'unauthenticated', message: 'Incorrect email or password' } },
        })
      }
      user = ADMIN_USER
      return route.fulfill({ json: { user } })
    }
    if (path === '/sign-out') {
      user = null
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: path } } })
  })
}

/**
 * Sign in as the admin through the real screen, for every tab of the page's browser: an admin's
 * learner tabs are signed in as them too.
 */
export async function signInAsAdmin(page: Page) {
  await adminServer(page.context())
  // What an admin saves goes to the server: one that keeps it, for every tab.
  await lessonServer(page.context())
  await appConfigServer(page.context())
  await page.goto('/sign-in')
  await page.getByLabel('Email address').fill(ADMIN.email)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN.password)
  await page.getByRole('button', { name: 'Sign In', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/texts$/)
}

/** A voice as the server lists it (`GET /api/speech/voices`). */
export type ServerVoice = {
  id: string
  name: string
  language: string
  gender: 'female' | 'male'
  default: boolean
}

const serverVoice = (
  id: string,
  language: string,
  isDefault = false,
  // Read off the id unless given: a Bengali voice's id does not say it.
  gender: ServerVoice['gender'] = id.charAt(1) === 'f' ? 'female' : 'male',
): ServerVoice => {
  const name = id.split('_')[1] ?? id
  return {
    id,
    name: `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
    language,
    gender,
    default: isDefault,
  }
}

/**
 * A small version of what the server offers: two accents of English, Hindi, and Bengali, which
 * is said by Hindi's speakers under ids of its own. Nothing for any other language.
 */
export const SERVER_VOICES: ServerVoice[] = [
  serverVoice('af_heart', 'en-US', true),
  serverVoice('af_bella', 'en-US'),
  serverVoice('am_michael', 'en-US', true),
  serverVoice('am_fenrir', 'en-US'),
  serverVoice('bf_emma', 'en-GB'),
  serverVoice('bm_george', 'en-GB'),
  serverVoice('hf_alpha', 'hi-IN', true),
  serverVoice('hm_omega', 'hi-IN', true),
  serverVoice('bn_alpha', 'bn-IN', true, 'female'),
  serverVoice('bn_omega', 'bn-IN', true, 'male'),
]

/** The same server before it could speak the language: what a learner of it then gets. */
export const serverVoicesWithout = (language: string): ServerVoice[] =>
  SERVER_VOICES.filter((voice) => !voice.language.startsWith(language))

/**
 * A twentieth of a second of silence, as a real sound file: the player is handed it, and one
 * it cannot read would be reported as a sound that failed.
 */
function silentWav(): Buffer {
  const rate = 8000
  const samples = rate / 20
  const data = Buffer.alloc(samples * 2)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(rate, 24)
  header.writeUInt32LE(rate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

/** One thing that was said: the text, and the id of the voice it was said in. */
export type Spoken = { text: string; voice: string }

/**
 * Stand in for the server's speaking routes, which no test has behind it, and for the player:
 * a sound "plays" at once and ends a moment later. `works`: the server lists `voices` and
 * answers every sound. `fails`: it lists them, but no sound can be fetched. `unreachable`: it
 * does not answer at all. What was said can be read back with `spoken`.
 */
export async function stubSpeech(
  target: Page | BrowserContext,
  mode: 'works' | 'fails' | 'unreachable' = 'works',
  voices: readonly ServerVoice[] = SERVER_VOICES,
) {
  await target.route('**/api/speech/voices', (route) =>
    mode === 'unreachable' ? route.abort() : route.fulfill({ json: { voices } }),
  )
  const sound = silentWav()
  await target.route('**/api/speech/audio**', (route) => {
    if (mode === 'works') {
      return route.fulfill({ status: 200, contentType: 'audio/wav', body: sound })
    }
    if (mode === 'unreachable') return route.abort()
    return route.fulfill({
      status: 503,
      json: { error: { code: 'unavailable', message: 'The speaking service is not answering' } },
    })
  })

  await target.addInitScript(() => {
    type Sound = { text: string; voice: string }
    const said: Sound[] = []
    Object.defineProperty(window, '__spoken', { value: said, configurable: true })

    // Which sound a fetched blob is, and which sound a blob's address is: the player is only
    // ever given the address.
    const sounds = new WeakMap<Blob, Sound>()
    const addresses = new Map<string, Sound>()

    const realFetch = window.fetch.bind(window)
    window.fetch = async (input, init) => {
      const response = await realFetch(input, init)
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname.endsWith('/speech/audio') && response.ok) {
        const sound = {
          text: url.searchParams.get('text') ?? '',
          voice: url.searchParams.get('voice') ?? '',
        }
        const realBlob = response.blob.bind(response)
        response.blob = async () => {
          const blob = await realBlob()
          sounds.set(blob, sound)
          return blob
        }
      }
      return response
    }

    const realCreate = URL.createObjectURL.bind(URL)
    URL.createObjectURL = (object: Blob | MediaSource) => {
      const address = realCreate(object)
      const sound = object instanceof Blob ? sounds.get(object) : undefined
      if (sound) addresses.set(address, sound)
      return address
    }

    const realPlay = HTMLMediaElement.prototype.play
    HTMLMediaElement.prototype.play = function play(this: HTMLMediaElement) {
      const sound = addresses.get(this.src)
      // Anything else (a learner's own recording) is the browser's to play.
      if (!sound && !this.src.startsWith('data:audio/')) return realPlay.call(this)
      if (sound) said.push(sound)
      if (sound) setTimeout(() => this.dispatchEvent(new Event('ended')), 50)
      return Promise.resolve()
    }
  })
}

/** Everything said (`stubSpeech`) since the page loaded: each text, and the voice it was in. */
export const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: Spoken[] }).__spoken)

/**
 * Make "has the learner touched the page?" answer for real taps only. Playwright's own look at
 * the page counts as a touch to the browser, so a test about what happens before the first tap
 * would otherwise depend on which came first, its look or the app's first screen.
 */
export async function untouchedUntilTapped(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    let touched = false
    window.addEventListener('pointerdown', () => (touched = true), { capture: true })
    Object.defineProperty(navigator, 'userActivation', {
      get: () => ({ hasBeenActive: touched, isActive: touched }),
      configurable: true,
    })
  })
}

/** Make the browser refuse the microphone, as when the learner taps "Block". */
export async function denyMicrophone(target: Page | BrowserContext) {
  await target.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
      configurable: true,
    })
  })
}

/**
 * Scrolls to the very end whatever it is that scrolls the element: the page on a phone, the
 * phone frame's screen on a tablet or anything wider.
 */
export async function scrollToEnd(inside: Locator) {
  await inside.evaluate((element) => {
    const scrolls = (candidate: Element) =>
      candidate.scrollHeight > candidate.clientHeight &&
      /auto|scroll/.test(getComputedStyle(candidate).overflowY)
    let scroller = element.parentElement
    while (scroller && !scrolls(scroller)) scroller = scroller.parentElement
    const target = scroller ?? document.scrollingElement
    target?.scrollTo(0, target.scrollHeight)
  })
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}
