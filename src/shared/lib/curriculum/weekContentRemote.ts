import {
  noContentSchema,
  storedLessonsSchema,
  WEEK_CONTENT_KINDS,
  weekContentSavedSchema,
  weekLessonsSchema,
  type WeekContentKind,
} from '@kuhedu/contracts'
import { apiRequest } from '../api/client'
import { settingsRepository } from '../appConfig/settingsRepository'
import { isStaleSave, type SettingsRemote } from '../appConfig/settingsRemote'

/**
 * A week's lesson content is kept on the server, in the database. The settings objects the
 * screens read (`week-dialogues`, `week-vocabulary`, …, each by week number) are this browser's
 * copy of it: **the screens go on reading them as before**, synchronously and with no loading
 * state, and this module keeps the copy in step.
 *
 * - A learner's browser fetches a week when it is opened (`ensureWeekContent`).
 * - An admin's browser fetches everything before an editor opens (`ensureAllLessonContent`),
 *   and a save goes to the server piece by piece (`lessonsRemote`), the copy following each
 *   piece the server has taken.
 *
 * The names are written out here, not imported from the files that own them: those files carry
 * the built-in content, which must not be pulled into the first bundle by a route's loader.
 * `weekContentRemote.test.ts` holds that they agree.
 */
export const WEEK_CONTENT_SETTINGS = {
  picture: 'week-pictures',
  dialogue: 'week-dialogues',
  vocabulary: 'week-vocabulary',
  sentences: 'week-sentences',
  roleplay: 'week-roleplays',
  challenge: 'week-challenges',
  quiz: 'week-quizzes',
  review_dialogue: 'week-review-dialogues',
  review_roleplay: 'week-review-roleplays',
  scenarios: 'week-scenarios',
} as const satisfies Record<WeekContentKind, string>

const kindOf = (name: string): WeekContentKind | undefined =>
  WEEK_CONTENT_KINDS.find((kind) => WEEK_CONTENT_SETTINGS[kind] === name)

/** How long a screen waits for its week before it opens on what this browser has. */
const WEEK_WAIT_MS = 1500
/** How long an editor waits for everything that is kept before it opens. */
const ALL_WAIT_MS = 6000
/** A week fetched this recently is not asked for again. */
const FRESH_FOR_MS = 20_000

/**
 * Kept in the browser once what it holds of the lessons is known to be the server's. Until
 * then (a browser an admin wrote lessons in before the server kept them) a week the server has
 * nothing for is left alone: it may be an admin's work that nobody has saved anywhere else.
 */
const IN_STEP_KEY = 'kuhedu-lessons-on-server'

let on = false
/** The version of each piece the server holds, as far as it is known here: `dialogue/12`. */
const versions = new Map<string, number>()
const fetchedAt = new Map<number, number>()
const asking = new Map<number, Promise<void>>()

const pieceName = (kind: WeekContentKind, week: number) => `${kind}/${week}`

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
    // Storage that cannot be written holds no lessons of its own to protect either.
  }
}

/** This browser's copy of a kind, by week, as it is stored. */
function copyOf(kind: WeekContentKind): Record<string, unknown> {
  try {
    const stored: unknown = JSON.parse(
      settingsRepository.readRaw(WEEK_CONTENT_SETTINGS[kind]) ?? 'null',
    )
    return typeof stored === 'object' && stored !== null && !Array.isArray(stored)
      ? { ...(stored as Record<string, unknown>) }
      : {}
  } catch {
    return {}
  }
}

/** Put a piece into this browser's copy, or take it out (`null`). Screens follow at once. */
function keepHere(kind: WeekContentKind, week: number, value: unknown) {
  const all = copyOf(kind)
  const had = all[week]
  if (value === null ? had === undefined : JSON.stringify(had) === JSON.stringify(value)) return
  const others = Object.entries(all).filter(([other]) => Number(other) !== week)
  const copy = Object.fromEntries(value === null ? others : [...others, [String(week), value]])
  try {
    if (Object.keys(copy).length === 0) settingsRepository.remove(WEEK_CONTENT_SETTINGS[kind])
    else settingsRepository.write(WEEK_CONTENT_SETTINGS[kind], copy)
  } catch {
    // The browser's storage is full: this piece is then shown as built in, or not at all.
    // TODO(backend): keep the live copy in memory, with storage as its best-effort copy.
  }
}

/**
 * Start keeping the lessons in step with the server. Called once by the app shell. Without it
 * (every unit test of a screen or an editor) the settings are this browser's alone, as before.
 */
export function startLessonContent() {
  on = true
  // A browser with no lessons of its own has nothing an admin could lose.
  if (!inStep() && WEEK_CONTENT_KINDS.every((kind) => Object.keys(copyOf(kind)).length === 0)) {
    markInStep()
  }
}

/** For tests: as before it was started, with nothing remembered. */
export function stopLessonContent() {
  on = false
  versions.clear()
  fetchedAt.clear()
  asking.clear()
}

/** Whether the lessons are kept on the server (and an editor's save therefore goes there). */
export const lessonContentOnServer = () => on

const patience = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function fetchWeek(week: number) {
  const { content } = await apiRequest(`/lessons/weeks/${week}`, { schema: weekLessonsSchema })
  for (const kind of WEEK_CONTENT_KINDS) {
    const value = content[kind]
    // See `IN_STEP_KEY`: nothing on the server is not yet a reason to drop what is here.
    if (value === null && !inStep()) continue
    keepHere(kind, week, value)
  }
  fetchedAt.set(week, Date.now())
}

/**
 * Have a week's content here before its screen opens: awaited by the loaders of a week's
 * overview and of a lesson day. It never fails and never waits long. With the server slow or
 * unreachable the screen opens on what this browser has (the copy from last time, or what is
 * built in), and follows if the answer comes later.
 */
export function ensureWeekContent(week: number, maxMs = WEEK_WAIT_MS): Promise<void> {
  if (!on) return Promise.resolve()
  const last = fetchedAt.get(week)
  if (last !== undefined && Date.now() - last < FRESH_FOR_MS) return Promise.resolve()

  let under = asking.get(week)
  if (!under) {
    under = fetchWeek(week)
      .catch(() => {})
      .finally(() => asking.delete(week))
    asking.set(week, under)
  }
  return Promise.race([under, patience(maxMs)])
}

async function fetchAll() {
  const { pieces } = await apiRequest('/admin/lessons', { schema: storedLessonsSchema })
  versions.clear()
  const kept = new Set<string>()
  for (const { week, kind, value, version } of pieces) {
    versions.set(pieceName(kind, week), version)
    kept.add(pieceName(kind, week))
    keepHere(kind, week, value)
  }

  // What is here and not there. In a browser already in step it is a piece another admin
  // removed. In one that is not, it is work written before the server kept lessons: it is
  // given to the server, once, and from then on this browser is in step like any other.
  const wasInStep = inStep()
  for (const kind of WEEK_CONTENT_KINDS) {
    for (const [week, value] of Object.entries(copyOf(kind))) {
      if (kept.has(pieceName(kind, Number(week)))) continue
      if (wasInStep) keepHere(kind, Number(week), null)
      else await savePiece(kind, Number(week), value).catch(() => {})
    }
  }
  markInStep()
}

/**
 * Have everything that is kept here before an editor opens, with the version of each piece, so
 * that a save can say what it was written from. Awaited by the admin routes that edit lessons;
 * like `ensureWeekContent` it never fails.
 */
export function ensureAllLessonContent(maxMs = ALL_WAIT_MS): Promise<void> {
  if (!on) return Promise.resolve()
  return Promise.race([fetchAll().catch(() => {}), patience(maxMs)])
}

async function savePiece(kind: WeekContentKind, week: number, value: unknown) {
  const name = pieceName(kind, week)
  const { version } = await apiRequest(`/admin/lessons/weeks/${week}/${kind}`, {
    method: 'PUT',
    schema: weekContentSavedSchema,
    body: { value, version: versions.get(name) ?? 0 },
  })
  versions.set(name, version)
  keepHere(kind, week, value)
}

async function removePiece(kind: WeekContentKind, week: number) {
  const name = pieceName(kind, week)
  await apiRequest(`/admin/lessons/weeks/${week}/${kind}?version=${versions.get(name) ?? 0}`, {
    method: 'DELETE',
    schema: noContentSchema,
  })
  versions.delete(name)
  keepHere(kind, week, null)
}

const byWeek = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}

/**
 * The server as the place one of the lessons' settings objects is saved to: only the weeks that
 * changed are sent, each as its own piece. `undefined` while the lessons are not kept on the
 * server, and for a settings object that is not one of theirs: its editor then saves here.
 */
export function lessonsRemote(name: string): SettingsRemote | undefined {
  const kind = kindOf(name)
  if (!on || !kind) return undefined
  return {
    async save(previous, next) {
      const before = byWeek(previous)
      const after = byWeek(next)
      for (const week of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (JSON.stringify(before[week]) === JSON.stringify(after[week])) continue
        if (after[week] === undefined) await removePiece(kind, Number(week))
        else await savePiece(kind, Number(week), after[week])
      }
    },
  }
}

// Each piece the server takes is in this browser's copy at once; a save throws at the first it
// does not take, and the rest stay unsaved.
export { isStaleSave, type SettingsRemote }
