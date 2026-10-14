import {
  defaultLanguagesConfig,
  LANGUAGES_CONFIG_NAME,
  LANDING_CONFIG_NAME,
  type AppConfigName,
  type TextChange,
} from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Client from '../api/client'
import { ApiError, apiRequest } from '../api/client'
import { CURRICULUM_CONFIG_NAME } from '../curriculum/curriculumOverrides'
import { SCREEN_TEXTS_CONFIG_NAME } from '../i18n/screenTexts'
import {
  appConfigRemote,
  ensureAllAppConfig,
  ensureAppConfig,
  startAppConfig,
  stopAppConfig,
  textChanges,
} from './appConfigRemote'
import { isStaleSave } from './settingsRemote'
import { settingsRepository } from './settingsRepository'

// No server here: what it would be asked, and what it would answer, is the test's to say.
vi.mock('../api/client', async (original) => ({
  ...(await original<typeof Client>()),
  apiRequest: vi.fn(),
}))

type Texts = Record<string, Record<string, string>>

/** What the server keeps, and everything that was asked of it. */
let settings: Partial<Record<AppConfigName, { value: unknown; version: number }>>
let texts: { screen: Texts; curriculum: Texts }
let asked: { method: string; path: string; body?: unknown }[]
/** Set by a test to have the server be slow, or not answer at all: run before it does. */
let first: ((path: string) => Promise<void>) | null

const conflict = () => new ApiError(409, 'stale', { error: { code: 'conflict', message: 'stale' } })

/** The stand-in for the server's settings routes, as far as the app uses them. */
async function server(path: string, { method = 'GET', body }: { method?: string; body?: unknown }) {
  asked.push({ method, path, ...(body !== undefined && { body }) })
  await first?.(path)

  if (path === '/app-config') {
    return {
      settings: {
        landing: settings.landing?.value ?? null,
        languages: settings.languages?.value ?? null,
        'learner-profiles': settings['learner-profiles']?.value ?? null,
      },
      texts,
    }
  }
  if (path === '/admin/app-config') {
    return {
      settings: Object.entries(settings).map(([name, kept]) => ({ name, ...kept })),
      texts,
    }
  }

  const scope = /^\/admin\/app-config\/texts\/(screen|curriculum)$/.exec(path)?.[1]
  if (scope === 'screen' || scope === 'curriculum') {
    const kept = texts[scope]
    const { changes } = body as { changes: TextChange[] }
    for (const { language, key, from } of changes) {
      if ((kept[language]?.[key] ?? null) !== from) throw conflict()
    }
    for (const { language, key, to } of changes) {
      if (to === null) delete kept[language]?.[key]
      else (kept[language] ??= {})[key] = to
    }
    return null
  }

  const whole = /^\/admin\/app-config\/([\w-]+)(?:\?version=(\d+))?$/.exec(path)
  if (!whole) throw new Error(`Nothing at ${path}`)
  const name = whole[1] as AppConfigName
  const there = settings[name]
  const based = method === 'PUT' ? (body as { version: number }).version : Number(whole[2])
  if (based !== (there?.version ?? 0)) throw conflict()
  if (method === 'DELETE') {
    settings = Object.fromEntries(Object.entries(settings).filter(([other]) => other !== name))
    return null
  }
  const version = (there?.version ?? 0) + 1
  settings[name] = { value: (body as { value: unknown }).value, version }
  return { version }
}

/** This browser's copy of a settings object, as it is stored. */
const copy = (name: string): unknown => JSON.parse(settingsRepository.readRaw(name) ?? 'null')

/** The languages an admin offers: English and Tamil. */
const tamil = (name = 'தமிழ்') => ({
  languages: [
    { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: '/flags/us.svg' },
    { code: 'ta', nativeName: name, caption: 'Tamil', flagUrl: null },
  ],
  defaultCode: 'ta',
})

beforeEach(() => {
  localStorage.clear()
  stopAppConfig()
  settings = {}
  texts = { screen: {}, curriculum: {} }
  asked = []
  first = null
  vi.mocked(apiRequest)
    .mockReset()
    .mockImplementation(((path: string, options: { method?: string; body?: unknown }) =>
      server(path, options)) as typeof apiRequest)
})

afterEach(() => vi.useRealTimers())

describe('before it is started', () => {
  it('asks the server nothing, and an editor saves to this browser', async () => {
    await ensureAppConfig()
    await ensureAllAppConfig()

    expect(asked).toEqual([])
    expect(appConfigRemote(LANGUAGES_CONFIG_NAME)).toBeUndefined()
    expect(appConfigRemote(SCREEN_TEXTS_CONFIG_NAME)).toBeUndefined()
  })
})

describe('as the app opens', () => {
  it('fetches what an admin wrote into this browser’s copy, where the screens read it', async () => {
    settings.languages = { value: tamil(), version: 2 }
    texts.screen = { bn: { 'home.title': 'হোম' } }
    texts.curriculum = { hi: { 'week.16.goal': 'मुझे अपने दिन के बारे में बात करना आता है।' } }
    startAppConfig()

    await ensureAppConfig()

    expect(copy(LANGUAGES_CONFIG_NAME)).toEqual(tamil())
    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toEqual({ bn: { 'home.title': 'হোম' } })
    expect(copy(CURRICULUM_CONFIG_NAME)).toEqual(texts.curriculum)
    expect(copy(LANDING_CONFIG_NAME)).toBeNull()
  })

  it('drops what an admin removed since this browser last looked', async () => {
    startAppConfig()
    settings.languages = { value: tamil(), version: 1 }
    texts.screen = { bn: { 'home.title': 'হোম' } }
    await ensureAppConfig()

    stopAppConfig()
    startAppConfig()
    delete settings.languages
    texts.screen = {}
    await ensureAppConfig()

    expect(copy(LANGUAGES_CONFIG_NAME)).toBeNull()
    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toBeNull()
  })

  it('asks once, not at every screen', async () => {
    startAppConfig()

    await ensureAppConfig()
    await ensureAppConfig()

    expect(asked).toHaveLength(1)
  })

  it('opens on what this browser has when the server is slow, and follows when it answers', async () => {
    vi.useFakeTimers()
    let answer = () => {}
    first = () => new Promise((resolve) => (answer = resolve))
    settings.languages = { value: tamil(), version: 1 }
    startAppConfig()

    const waiting = ensureAppConfig()
    await vi.advanceTimersByTimeAsync(1500)
    await waiting
    expect(copy(LANGUAGES_CONFIG_NAME)).toBeNull()

    answer()
    await vi.runAllTimersAsync()
    expect(copy(LANGUAGES_CONFIG_NAME)).toEqual(tamil())
  })

  it('opens on what this browser has when the server cannot be reached', async () => {
    settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, { bn: { 'home.title': 'হোম' } })
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(0, 'offline'))
    startAppConfig()

    await ensureAppConfig()

    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toEqual({ bn: { 'home.title': 'হোম' } })
  })
})

describe('a browser an admin edited settings in before the server kept them', () => {
  beforeEach(() => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, tamil())
    settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, { bn: { 'home.title': 'হোম' } })
  })

  it('keeps that work while the server has nothing of it, beside what the server has', async () => {
    texts.screen = { hi: { 'home.title': 'होम' } }
    startAppConfig()

    await ensureAppConfig()

    expect(copy(LANGUAGES_CONFIG_NAME)).toEqual(tamil())
    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      hi: { 'home.title': 'होम' },
      bn: { 'home.title': 'হোম' },
    })
  })

  it('gives it to the server the first time an editor opens, and only then', async () => {
    texts.screen = { bn: { 'home.title': 'বাড়ি' }, hi: { 'home.title': 'होम' } }
    settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, {
      bn: { 'home.title': 'হোম', 'home.subtitle': 'আজকের পাঠ' },
    })
    startAppConfig()

    await ensureAllAppConfig()

    expect(settings.languages).toEqual({ value: tamil(), version: 1 })
    // What the server has stands; what it lacks is given to it.
    expect(texts.screen).toEqual({
      bn: { 'home.title': 'বাড়ি', 'home.subtitle': 'আজকের পাঠ' },
      hi: { 'home.title': 'होम' },
    })
    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toEqual(texts.screen)

    // From then on this browser is in step: what the server removes, it removes.
    asked = []
    delete settings.languages
    await ensureAllAppConfig()
    expect(asked.map(({ method }) => method)).toEqual(['GET'])
    expect(copy(LANGUAGES_CONFIG_NAME)).toBeNull()
  })
})

describe('an editor’s save', () => {
  beforeEach(async () => {
    settings.languages = { value: tamil(), version: 3 }
    texts.screen = { bn: { 'home.title': 'হোম' } }
    startAppConfig()
    await ensureAllAppConfig()
    asked = []
  })

  it('sends a settings object whole, with the version it was written from', async () => {
    await appConfigRemote(LANGUAGES_CONFIG_NAME)?.save(tamil(), tamil('Tamil'))

    expect(asked).toEqual([
      {
        method: 'PUT',
        path: '/admin/app-config/languages',
        body: { value: tamil('Tamil'), version: 3 },
      },
    ])
    expect(copy(LANGUAGES_CONFIG_NAME)).toEqual(tamil('Tamil'))
  })

  it('removes a settings object set back to what is built in', async () => {
    await appConfigRemote(LANGUAGES_CONFIG_NAME)?.save(tamil(), defaultLanguagesConfig)

    expect(asked).toEqual([{ method: 'DELETE', path: '/admin/app-config/languages?version=3' }])
    expect(settings.languages).toBeUndefined()
    expect(copy(LANGUAGES_CONFIG_NAME)).toBeNull()
  })

  it('sends only the texts that changed, each with what it was', async () => {
    await appConfigRemote(SCREEN_TEXTS_CONFIG_NAME)?.save(
      { bn: { 'home.title': 'হোম' } },
      { bn: { 'home.subtitle': 'আজকের পাঠ' }, hi: { 'home.title': 'होम' } },
    )

    expect(asked).toEqual([
      {
        method: 'PATCH',
        path: '/admin/app-config/texts/screen',
        body: {
          changes: [
            { language: 'bn', key: 'home.title', from: 'হোম', to: null },
            { language: 'bn', key: 'home.subtitle', from: null, to: 'আজকের পাঠ' },
            { language: 'hi', key: 'home.title', from: null, to: 'होम' },
          ],
        },
      },
    ])
    expect(copy(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      bn: { 'home.subtitle': 'আজকের পাঠ' },
      hi: { 'home.title': 'होम' },
    })
  })

  it('is refused when another admin saved first, and leaves this browser’s copy as it was', async () => {
    settings.languages = { value: tamil('Tamil'), version: 4 }

    const failed = await appConfigRemote(LANGUAGES_CONFIG_NAME)
      ?.save(tamil(), tamil('தமிழ் மொழி'))
      .catch((error: unknown) => error)

    expect(isStaleSave(failed)).toBe(true)
    expect(copy(LANGUAGES_CONFIG_NAME)).toEqual(tamil())
  })

  it('belongs to none of these for the lessons’ settings', () => {
    expect(appConfigRemote('week-dialogues')).toBeUndefined()
  })
})

describe('the changes between two sets of texts', () => {
  it('are none when the two are the same', () => {
    expect(textChanges({ bn: { a: 'এক' } }, { bn: { a: 'এক' } })).toEqual([])
  })

  it('name every text set, changed or set back, once', () => {
    expect(
      textChanges({ bn: { a: 'এক', b: 'দুই' } }, { bn: { a: 'এক', b: 'তিন' }, hi: { a: 'एक' } }),
    ).toEqual([
      { language: 'bn', key: 'b', from: 'দুই', to: 'তিন' },
      { language: 'hi', key: 'a', from: null, to: 'एक' },
    ])
    expect(textChanges({ bn: { a: 'এক' } }, {})).toEqual([
      { language: 'bn', key: 'a', from: 'এক', to: null },
    ])
  })
})
