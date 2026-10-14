import {
  APP_CONFIG_NAMES,
  appConfigResponseSchema,
  appConfigSavedSchema,
  isKeptText,
  noContentSchema,
  parseAppConfig,
  storedAppConfigSchema,
  TEXT_SCOPE_SETTINGS,
  TEXT_SCOPES,
  type AppConfigName,
  type TextChange,
  type TextScope,
} from '@kuhedu/contracts'
import { apiRequest } from '../api/client'
import { asText, type SettingsRemote } from './settingsRemote'
import { settingsRepository } from './settingsRepository'

/**
 * Everything an admin manages besides the lessons is kept on the server: the landing page, the
 * languages and the profile pictures whole, the screen texts and the course's wording one text
 * at a time. The settings objects the screens read are this browser's copy of it: **the screens
 * go on reading them as before**, synchronously and with no loading state, and this module keeps
 * the copy in step, as `weekContentRemote` does for the lessons.
 *
 * - Every browser fetches it all as the app opens (`ensureAppConfig`, awaited by the root
 *   route's loader for a moment), so a learner sees what an admin wrote at their next visit.
 * - An admin's browser fetches it again, with versions, before an editor opens
 *   (`ensureAllAppConfig`), and a save goes to the server (`appConfigRemote`).
 * - Offline, or with the server down, the screens run on the copy from last time, or on what is
 *   built in.
 */

/** How long the first screen waits for the settings before it opens on what this browser has. */
const START_WAIT_MS = 1500
/** How long an editor waits for everything that is kept before it opens. */
const ALL_WAIT_MS = 6000
/** Settings fetched this recently are not asked for again. */
const FRESH_FOR_MS = 60_000

/**
 * Kept in the browser once what it holds of these settings is known to be the server's. Until
 * then (a browser an admin edited them in before the server kept them) what the server has
 * nothing of is left alone, and given to the server the first time an editor opens here.
 */
const IN_STEP_KEY = 'kuhedu-settings-on-server'

type Texts = Record<string, Record<string, string>>

const SCOPE_OF_SETTING = Object.fromEntries(
  TEXT_SCOPES.map((scope) => [TEXT_SCOPE_SETTINGS[scope], scope]),
) as Record<string, TextScope | undefined>

const isWhole = (name: string): name is AppConfigName =>
  (APP_CONFIG_NAMES as readonly string[]).includes(name)

let on = false
/** The version of each settings object the server holds, as far as it is known here. */
const versions = new Map<AppConfigName, number>()
let fetchedAt = 0
let asking: Promise<void> | null = null

function inStep(): boolean {
  try {
    return localStorage.getItem(IN_STEP_KEY) === '1'
  } catch {
    return true
  }
}

function markInStep() {
  try {
    localStorage.setItem(IN_STEP_KEY, '1')
  } catch {
    // Storage that cannot be written holds no settings of its own to protect either.
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** This browser's copy of a settings object, as it is stored; `undefined` when there is none. */
function copyOf(name: string): unknown {
  try {
    const raw = settingsRepository.readRaw(name)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

/** This browser's copy of a scope's texts: only the well-formed ones. */
function textsHere(scope: TextScope): Texts {
  const stored = copyOf(TEXT_SCOPE_SETTINGS[scope])
  const texts: Texts = {}
  if (!isRecord(stored)) return texts
  for (const [language, entries] of Object.entries(stored)) {
    if (!isRecord(entries)) continue
    for (const [key, text] of Object.entries(entries)) {
      if (typeof text === 'string' && isKeptText(language, key, text)) {
        ;(texts[language] ??= {})[key] = text
      }
    }
  }
  return texts
}

const hasAny = (texts: Texts) => Object.values(texts).some((entries) => Object.keys(entries).length)

/** Put a settings object into this browser's copy, or take it out (`null`). Screens follow. */
function keepHere(name: string, value: unknown) {
  const had = copyOf(name)
  if (value === null ? had === undefined : had !== undefined && asText(had) === asText(value)) {
    return
  }
  try {
    if (value === null) settingsRepository.remove(name)
    else settingsRepository.write(name, value)
  } catch {
    // The browser's storage is full: the screens then show what is built in.
    // TODO(backend): keep the live copy in memory, with storage as its best-effort copy.
  }
}

const keepTexts = (scope: TextScope, texts: Texts) =>
  keepHere(TEXT_SCOPE_SETTINGS[scope], hasAny(texts) ? texts : null)

/** Every text of `extra` that `base` does not have, added to it. */
function joined(base: Texts, extra: Texts): Texts {
  const all: Texts = Object.fromEntries(
    Object.entries(base).map(([language, entries]) => [language, { ...entries }]),
  )
  for (const [language, entries] of Object.entries(extra)) {
    for (const [key, text] of Object.entries(entries)) {
      if (all[language]?.[key] === undefined) (all[language] ??= {})[key] = text
    }
  }
  return all
}

/**
 * Start keeping these settings in step with the server. Called once by the app shell. Without it
 * (every unit test of a screen or an editor) the settings are this browser's alone, as before.
 */
export function startAppConfig() {
  on = true
  // A browser with none of these settings of its own has nothing an admin could lose.
  const names = [...APP_CONFIG_NAMES, ...TEXT_SCOPES.map((scope) => TEXT_SCOPE_SETTINGS[scope])]
  if (!inStep() && names.every((name) => copyOf(name) === undefined)) markInStep()
}

/** For tests: as before it was started, with nothing remembered. */
export function stopAppConfig() {
  on = false
  versions.clear()
  fetchedAt = 0
  asking = null
}

const patience = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function fetchPublic() {
  const { settings, texts } = await apiRequest('/app-config', { schema: appConfigResponseSchema })
  const step = inStep()
  for (const name of APP_CONFIG_NAMES) {
    const value = settings[name] ?? null
    // See `IN_STEP_KEY`: nothing on the server is not yet a reason to drop what is here.
    if (value === null && !step) continue
    keepHere(name, value)
  }
  for (const scope of TEXT_SCOPES) {
    const there = texts[scope] ?? {}
    keepTexts(scope, step ? there : joined(there, textsHere(scope)))
  }
  fetchedAt = Date.now()
}

/**
 * Have the server's settings here before the first screen opens: awaited by the root route's
 * loader. It never fails and never waits long; with the server slow or unreachable the screen
 * opens on what this browser has, and follows if the answer comes later.
 */
export function ensureAppConfig(maxMs = START_WAIT_MS): Promise<void> {
  if (!on || Date.now() - fetchedAt < FRESH_FOR_MS) return Promise.resolve()
  asking ??= fetchPublic()
    .catch(() => {})
    .finally(() => {
      asking = null
    })
  return Promise.race([asking, patience(maxMs)])
}

async function fetchAll() {
  const stored = await apiRequest('/admin/app-config', { schema: storedAppConfigSchema })
  const wasInStep = inStep()

  versions.clear()
  for (const { name, value, version } of stored.settings) {
    versions.set(name, version)
    keepHere(name, value)
  }
  for (const name of APP_CONFIG_NAMES) {
    if (versions.has(name)) continue
    const here = copyOf(name)
    if (here === undefined) continue
    // In a browser already in step it is something another admin removed. In one that is not,
    // it is work written before the server kept settings: given to the server, once.
    if (wasInStep) keepHere(name, null)
    else await saveWhole(name, here).catch(() => {})
  }

  for (const scope of TEXT_SCOPES) {
    const there = stored.texts[scope] ?? {}
    const here = textsHere(scope)
    const missing: TextChange[] = wasInStep
      ? []
      : Object.entries(here).flatMap(([language, entries]) =>
          Object.entries(entries)
            .filter(([key]) => there[language]?.[key] === undefined)
            .map(([key, text]) => ({ language, key, from: null, to: text })),
        )
    const given =
      missing.length > 0 &&
      (await sendTexts(scope, missing).then(
        () => true,
        () => false,
      ))
    keepTexts(scope, given ? joined(there, here) : there)
  }

  markInStep()
  fetchedAt = Date.now()
}

/**
 * Have everything that is kept here before an editor opens, with the version of each settings
 * object, so that a save can say what it was written from. Awaited by the admin routes; like
 * `ensureAppConfig` it never fails.
 */
export function ensureAllAppConfig(maxMs = ALL_WAIT_MS): Promise<void> {
  if (!on) return Promise.resolve()
  return Promise.race([fetchAll().catch(() => {}), patience(maxMs)])
}

async function saveWhole(name: AppConfigName, value: unknown) {
  const { version } = await apiRequest(`/admin/app-config/${name}`, {
    method: 'PUT',
    schema: appConfigSavedSchema,
    body: { value, version: versions.get(name) ?? 0 },
  })
  versions.set(name, version)
  keepHere(name, value)
}

async function removeWhole(name: AppConfigName) {
  await apiRequest(`/admin/app-config/${name}?version=${versions.get(name) ?? 0}`, {
    method: 'DELETE',
    schema: noContentSchema,
  })
  versions.delete(name)
  keepHere(name, null)
}

function sendTexts(scope: TextScope, changes: TextChange[]) {
  return apiRequest(`/admin/app-config/texts/${scope}`, {
    method: 'PATCH',
    schema: noContentSchema,
    body: { changes },
  })
}

const textsOf = (value: unknown): Texts =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value).map(([language, entries]) => [
          language,
          isRecord(entries)
            ? Object.fromEntries(
                Object.entries(entries).filter(
                  (entry): entry is [string, string] => typeof entry[1] === 'string',
                ),
              )
            : {},
        ]),
      )
    : {}

/** Every text that differs between two sets of texts, as the server takes a change. */
export function textChanges(previous: unknown, next: unknown): TextChange[] {
  const before = textsOf(previous)
  const after = textsOf(next)
  const changes: TextChange[] = []
  for (const language of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const was = before[language] ?? {}
    const now = after[language] ?? {}
    for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
      const from = was[key] ?? null
      const to = now[key] ?? null
      if (from !== to) changes.push({ language, key, from, to })
    }
  }
  return changes
}

/**
 * The server as the place one of these settings objects is saved to. A whole object is sent
 * whole, and set back to what is built in by being removed; texts are sent one change at a
 * time, each with what it was when the editor opened. `undefined` while the settings are not
 * kept on the server, and for a settings object that is not one of these.
 */
export function appConfigRemote(name: string): SettingsRemote | undefined {
  if (!on) return undefined

  if (isWhole(name)) {
    return {
      async save(_previous, next) {
        // Saving what is built in is having nothing of one's own: the row goes.
        if (asText(next) === asText(parseAppConfig(name, {}))) await removeWhole(name)
        else await saveWhole(name, next)
      },
    }
  }

  const scope = SCOPE_OF_SETTING[name]
  if (!scope) return undefined
  return {
    async save(previous, next) {
      const changes = textChanges(previous, next)
      if (changes.length > 0) await sendTexts(scope, changes)
      keepTexts(scope, textsOf(next))
    },
  }
}
