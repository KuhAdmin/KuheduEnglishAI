import { WEEK_CONTENT_KINDS, type WeekContentKind } from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Client from '../api/client'
import { ApiError, apiRequest } from '../api/client'
import { settingsRepository } from '../appConfig/settingsRepository'
import { WEEK_CHALLENGES_CONFIG_NAME } from './weekChallenges'
import {
  ensureAllLessonContent,
  ensureWeekContent,
  isStaleSave,
  lessonContentOnServer,
  lessonsRemote,
  startLessonContent,
  stopLessonContent,
  WEEK_CONTENT_SETTINGS,
} from './weekContentRemote'
import { WEEK_DIALOGUES_CONFIG_NAME, weekDialogue, weekDialoguesSchema } from './weekDialogues'
import { WEEK_PICTURES_CONFIG_NAME } from './weekPictures'
import { WEEK_QUIZZES_CONFIG_NAME } from './weekQuizzes'
import { WEEK_REVIEW_DIALOGUES_CONFIG_NAME, WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME } from './weekReviews'
import { WEEK_ROLEPLAYS_CONFIG_NAME } from './weekRoleplays'
import { WEEK_SCENARIOS_CONFIG_NAME } from './weekScenarios'
import { WEEK_SENTENCES_CONFIG_NAME } from './weekSentences'
import { WEEK_VOCABULARY_CONFIG_NAME } from './weekVocabulary'

// No server here: what it would be asked, and what it would answer, is the test's to say.
vi.mock('../api/client', async (original) => ({
  ...(await original<typeof Client>()),
  apiRequest: vi.fn(),
}))

/** A conversation as the server keeps one. */
const greeting = (second = 'Good morning!') => ({
  videoUrl: null,
  lines: [
    { speaker: 'Asha', text: 'Hello!', translations: { bn: 'হ্যালো!' } },
    { speaker: 'Ravi', text: second, translations: {} },
  ],
})

type Piece = { week: number; kind: WeekContentKind; value: unknown; version: number }

/** What the server keeps, and everything that was asked of it. */
let kept: Piece[]
let asked: { method: string; path: string; body?: unknown }[]
/** Set by a test to have the server be slow, or not answer at all: run before it does. */
let first: ((path: string) => Promise<void>) | null

const find = (kind: string, week: number) =>
  kept.find((piece) => piece.kind === kind && piece.week === week)

/** The stand-in for the server's lesson routes, as far as the app uses them. */
async function server(path: string, { method = 'GET', body }: { method?: string; body?: unknown }) {
  asked.push({ method, path, ...(body !== undefined && { body }) })
  await first?.(path)

  const week = /^\/lessons\/weeks\/(\d+)$/.exec(path)
  if (week) {
    const number = Number(week[1])
    return {
      week: number,
      content: Object.fromEntries(
        WEEK_CONTENT_KINDS.map((kind) => [kind, find(kind, number)?.value ?? null]),
      ),
    }
  }
  if (path === '/admin/lessons') return { pieces: kept }

  const piece = /^\/admin\/lessons\/weeks\/(\d+)\/(\w+)(?:\?version=(\d+))?$/.exec(path)
  if (!piece) throw new Error(`Nothing at ${path}`)
  const [, number, kind, removing] = piece
  const there = find(String(kind), Number(number))
  const based = method === 'PUT' ? (body as { version: number }).version : Number(removing)
  if (based !== (there?.version ?? 0)) {
    throw new ApiError(409, 'stale', { error: { code: 'conflict', message: 'stale' } })
  }
  kept = kept.filter((other) => other !== there)
  if (method === 'DELETE') return null
  const version = (there?.version ?? 0) + 1
  kept.push({
    week: Number(number),
    kind: kind as WeekContentKind,
    value: (body as { value: unknown }).value,
    version,
  })
  return { version }
}

/** This browser's copy of a settings object, as it is stored. */
const copy = (name: string): unknown => JSON.parse(settingsRepository.readRaw(name) ?? 'null')

const dialoguesHere = () => weekDialoguesSchema.parse(copy(WEEK_DIALOGUES_CONFIG_NAME))

beforeEach(() => {
  localStorage.clear()
  stopLessonContent()
  kept = []
  asked = []
  first = null
  vi.mocked(apiRequest)
    .mockReset()
    .mockImplementation(((path: string, options: { method?: string; body?: unknown }) =>
      server(path, options)) as typeof apiRequest)
})

afterEach(() => vi.useRealTimers())

describe('the settings objects the lessons are kept in', () => {
  it('are named here as the files that own them name them', () => {
    expect(WEEK_CONTENT_SETTINGS).toEqual({
      picture: WEEK_PICTURES_CONFIG_NAME,
      dialogue: WEEK_DIALOGUES_CONFIG_NAME,
      vocabulary: WEEK_VOCABULARY_CONFIG_NAME,
      sentences: WEEK_SENTENCES_CONFIG_NAME,
      roleplay: WEEK_ROLEPLAYS_CONFIG_NAME,
      challenge: WEEK_CHALLENGES_CONFIG_NAME,
      quiz: WEEK_QUIZZES_CONFIG_NAME,
      review_dialogue: WEEK_REVIEW_DIALOGUES_CONFIG_NAME,
      review_roleplay: WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME,
      scenarios: WEEK_SCENARIOS_CONFIG_NAME,
    })
    expect(Object.keys(WEEK_CONTENT_SETTINGS)).toEqual([...WEEK_CONTENT_KINDS])
  })
})

describe('before it is started', () => {
  it('asks the server nothing, and an editor saves to this browser', async () => {
    await ensureWeekContent(1)
    await ensureAllLessonContent()

    expect(asked).toEqual([])
    expect(lessonContentOnServer()).toBe(false)
    expect(lessonsRemote(WEEK_DIALOGUES_CONFIG_NAME)).toBeUndefined()
  })
})

describe('a week opened by a learner', () => {
  it('is fetched into this browser’s copy, where the screens read it', async () => {
    kept = [
      { week: 2, kind: 'dialogue', value: greeting(), version: 3 },
      { week: 2, kind: 'picture', value: '/pictures/week-2.webp', version: 1 },
    ]
    startLessonContent()

    await ensureWeekContent(2)

    expect(asked).toEqual([{ method: 'GET', path: '/lessons/weeks/2' }])
    expect(weekDialogue(2, dialoguesHere())).toEqual(greeting())
    expect(copy(WEEK_PICTURES_CONFIG_NAME)).toEqual({ 2: '/pictures/week-2.webp' })
    // A kind the week has nothing of is not written at all.
    expect(copy(WEEK_VOCABULARY_CONFIG_NAME)).toBeNull()
  })

  it('follows the server: what was changed there changes here, what was removed goes', async () => {
    kept = [
      { week: 1, kind: 'dialogue', value: greeting(), version: 1 },
      { week: 2, kind: 'dialogue', value: greeting('Hi!'), version: 1 },
    ]
    startLessonContent()
    vi.useFakeTimers({ now: 0, toFake: ['Date'] })
    await ensureWeekContent(1)
    await ensureWeekContent(2)

    // An admin rewrites Week 1's conversation and removes Week 2's.
    kept = [{ week: 1, kind: 'dialogue', value: greeting('Good evening!'), version: 2 }]
    vi.setSystemTime(60_000)
    await ensureWeekContent(1)
    await ensureWeekContent(2)

    expect(dialoguesHere()).toEqual({ 1: greeting('Good evening!') })
  })

  it('is not asked for again a moment later, and is once some time has passed', async () => {
    startLessonContent()
    vi.useFakeTimers({ now: 0, toFake: ['Date'] })

    await ensureWeekContent(1)
    await ensureWeekContent(1)
    expect(asked).toHaveLength(1)

    vi.setSystemTime(60_000)
    await ensureWeekContent(1)
    expect(asked).toHaveLength(2)
  })

  it('opens on what this browser has when the server cannot be reached', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: greeting() })
    startLessonContent()
    first = async () => {
      throw new TypeError('Failed to fetch')
    }

    await ensureWeekContent(1)

    expect(dialoguesHere()).toEqual({ 1: greeting() })
  })

  it('does not hold a screen back for a slow server, and follows when the answer comes', async () => {
    kept = [{ week: 1, kind: 'dialogue', value: greeting(), version: 1 }]
    startLessonContent()
    let arrive: () => void = () => {}
    const slow = new Promise<void>((resolve) => (arrive = resolve))
    first = () => slow

    const started = performance.now()
    await ensureWeekContent(1, 20)
    expect(performance.now() - started).toBeLessThan(500)
    expect(copy(WEEK_DIALOGUES_CONFIG_NAME)).toBeNull()

    arrive()
    await vi.waitFor(() => expect(dialoguesHere()).toEqual({ 1: greeting() }))
  })

  it('leaves alone lessons an admin wrote here before the server kept any', async () => {
    // A browser from before: its own conversation for Week 3, saved nowhere else.
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 3: greeting('Written here.') })
    startLessonContent()

    await ensureWeekContent(3)

    expect(dialoguesHere()).toEqual({ 3: greeting('Written here.') })
  })
})

describe('an editor opening', () => {
  it('has everything the server keeps, and nothing it no longer does', async () => {
    startLessonContent()
    kept = [{ week: 1, kind: 'dialogue', value: greeting(), version: 1 }]
    await ensureAllLessonContent()
    expect(dialoguesHere()).toEqual({ 1: greeting() })

    // Another admin replaces it with one for Week 2.
    kept = [{ week: 2, kind: 'dialogue', value: greeting('Hi!'), version: 1 }]
    await ensureAllLessonContent()

    expect(dialoguesHere()).toEqual({ 2: greeting('Hi!') })
  })

  it('gives the server, once, the lessons an admin wrote here before it kept any', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 3: greeting('Written here.') })
    kept = [{ week: 1, kind: 'dialogue', value: greeting(), version: 1 }]
    startLessonContent()

    await ensureAllLessonContent()

    expect(find('dialogue', 3)).toMatchObject({ value: greeting('Written here.'), version: 1 })
    expect(dialoguesHere()).toEqual({ 1: greeting(), 3: greeting('Written here.') })

    // From then on this browser is in step: what the server drops, it drops.
    kept = kept.filter((piece) => piece.week !== 3)
    await ensureAllLessonContent()
    expect(dialoguesHere()).toEqual({ 1: greeting() })
  })

  it('opens on this browser’s copy when the server cannot be reached', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: greeting() })
    startLessonContent()
    first = async () => {
      throw new TypeError('Failed to fetch')
    }

    await ensureAllLessonContent()

    expect(dialoguesHere()).toEqual({ 1: greeting() })
  })
})

describe('an editor’s save', () => {
  const remote = () => {
    const found = lessonsRemote(WEEK_DIALOGUES_CONFIG_NAME)
    if (!found) throw new Error('The lessons are not kept on the server')
    return found
  }

  beforeEach(async () => {
    kept = [{ week: 1, kind: 'dialogue', value: greeting(), version: 4 }]
    startLessonContent()
    await ensureAllLessonContent()
    asked = []
  })

  it('goes to the server only for a settings object that is the lessons’', () => {
    expect(lessonsRemote('landing')).toBeUndefined()
    expect(lessonsRemote(WEEK_PICTURES_CONFIG_NAME)).toBeDefined()
  })

  it('sends only the weeks that changed, each from the version it was written from', async () => {
    const before = { 1: greeting() }

    await remote().save(before, { 1: greeting('Good evening!'), 2: greeting('Hi!') })

    expect(asked).toEqual([
      {
        method: 'PUT',
        path: '/admin/lessons/weeks/1/dialogue',
        body: { value: greeting('Good evening!'), version: 4 },
      },
      {
        method: 'PUT',
        path: '/admin/lessons/weeks/2/dialogue',
        body: { value: greeting('Hi!'), version: 0 },
      },
    ])
    expect(dialoguesHere()).toEqual({ 1: greeting('Good evening!'), 2: greeting('Hi!') })

    // The next save of the same piece is written from the version the last one made.
    asked = []
    await remote().save({ 1: greeting('Good evening!') }, { 1: greeting('Good night!') })
    expect(asked[0]?.body).toMatchObject({ version: 5 })
  })

  it('removes a week whose piece was dropped', async () => {
    await remote().save({ 1: greeting() }, {})

    expect(asked).toEqual([{ method: 'DELETE', path: '/admin/lessons/weeks/1/dialogue?version=4' }])
    expect(kept).toEqual([])
    expect(copy(WEEK_DIALOGUES_CONFIG_NAME)).toBeNull()
  })

  it('asks nothing when nothing changed', async () => {
    await remote().save({ 1: greeting() }, { 1: greeting() })

    expect(asked).toEqual([])
  })

  it('does not write over what someone else saved since: it says so, and nothing changes here', async () => {
    // Another admin saves Week 1 while this editor is open.
    kept = [{ week: 1, kind: 'dialogue', value: greeting('Theirs.'), version: 5 }]

    const save = remote().save({ 1: greeting() }, { 1: greeting('Mine.') })

    await expect(save).rejects.toSatisfy(isStaleSave)
    expect(find('dialogue', 1)?.value).toEqual(greeting('Theirs.'))
    expect(dialoguesHere()).toEqual({ 1: greeting() })
  })

  it('keeps what the server took when a later piece fails, and leaves the rest unsaved', async () => {
    first = async (path) => {
      if (path.includes('/weeks/3/')) throw new TypeError('Failed to fetch')
    }

    const save = remote().save(
      { 1: greeting() },
      { 1: greeting(), 2: greeting('Hi!'), 3: greeting('Bye!') },
    )

    await expect(save).rejects.not.toSatisfy(isStaleSave)
    expect(dialoguesHere()).toEqual({ 1: greeting(), 2: greeting('Hi!') })
  })
})
