import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Client from '@/shared/lib/api/client'
import { ApiError, apiRequest } from '@/shared/lib/api/client'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import {
  ensureAllLessonContent,
  startLessonContent,
  stopLessonContent,
} from '@/shared/lib/curriculum/weekContentRemote'
import {
  defaultWeekDialogues,
  WEEK_DIALOGUES_CONFIG_NAME,
  weekDialoguesSchema,
  type WeekDialogues,
} from '@/shared/lib/curriculum/weekDialogues'
import { useSettingsDraft } from './useSettingsDraft'

// No server here: what it would be asked, and what it would answer, is the test's to say.
vi.mock('@/shared/lib/api/client', async (original) => ({
  ...(await original<typeof Client>()),
  apiRequest: vi.fn(),
}))

const greeting = (second = 'Good morning!') => ({
  videoUrl: null,
  lines: [
    { speaker: 'Asha', text: 'Hello!', translations: {} },
    { speaker: 'Ravi', text: second, translations: {} },
  ],
})

const dialogues = () =>
  renderHook(() =>
    useSettingsDraft<WeekDialogues>({
      name: WEEK_DIALOGUES_CONFIG_NAME,
      schema: weekDialoguesSchema,
      defaults: defaultWeekDialogues,
    }),
  )

const stored = (): unknown =>
  JSON.parse(settingsRepository.readRaw(WEEK_DIALOGUES_CONFIG_NAME) ?? 'null')

/** What the server was sent. */
const sent = () =>
  vi
    .mocked(apiRequest)
    .mock.calls.filter(([, options]) => options.method === 'PUT' || options.method === 'DELETE')
    .map(([path, options]) => ({ method: options.method, path, body: options.body }))

beforeEach(() => {
  localStorage.clear()
  stopLessonContent()
  vi.mocked(apiRequest)
    .mockReset()
    .mockImplementation((async (path: string, options: { method?: string }) => {
      if (path === '/admin/lessons') return { pieces: [] }
      return options.method === 'PUT' ? { version: 1 } : null
    }) as typeof apiRequest)
})

afterEach(() => stopLessonContent())

describe('a save, while the lessons are this browser’s alone', () => {
  it('is written here at once, as it always was', () => {
    const { result } = dialogues()

    act(() => result.current.update(() => ({ 2: greeting() })))
    act(() => result.current.save())

    expect(result.current.status).toBe('saved')
    expect(result.current.isDirty).toBe(false)
    expect(stored()).toEqual({ 2: greeting() })
    expect(apiRequest).not.toHaveBeenCalled()
  })
})

describe('a save of lessons kept on the server', () => {
  beforeEach(async () => {
    startLessonContent()
    await ensureAllLessonContent()
  })

  it('goes to the server, and is saved once the server has taken it', async () => {
    let taken: () => void = () => {}
    vi.mocked(apiRequest).mockImplementation((async () => {
      await new Promise<void>((resolve) => (taken = resolve))
      return { version: 1 }
    }) as typeof apiRequest)
    const { result } = dialogues()

    act(() => result.current.update(() => ({ 2: greeting() })))
    act(() => result.current.save())

    // On its way: not saved yet, and not to be sent a second time.
    expect(result.current.status).toBe('saving')
    expect(stored()).toBeNull()
    act(() => result.current.save())
    expect(sent()).toHaveLength(1)

    await act(async () => taken())
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(result.current.isDirty).toBe(false)
    expect(stored()).toEqual({ 2: greeting() })
    expect(sent()).toEqual([
      {
        method: 'PUT',
        path: '/admin/lessons/weeks/2/dialogue',
        body: { value: greeting(), version: 0 },
      },
    ])
  })

  it('keeps what was typed when the server cannot be reached, to be saved again', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new TypeError('Failed to fetch'))
    const { result } = dialogues()

    act(() => result.current.update(() => ({ 2: greeting() })))
    act(() => result.current.save())

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.isDirty).toBe(true)
    expect(result.current.value).toEqual({ 2: greeting() })
    expect(stored()).toBeNull()

    // The connection is back.
    vi.mocked(apiRequest).mockResolvedValue({ version: 1 })
    act(() => result.current.save())
    await waitFor(() => expect(result.current.status).toBe('saved'))
    expect(stored()).toEqual({ 2: greeting() })
  })

  it('says when someone else saved the same thing first, and writes over nothing', async () => {
    vi.mocked(apiRequest).mockRejectedValue(
      new ApiError(409, 'stale', { error: { code: 'conflict', message: 'stale' } }),
    )
    const { result } = dialogues()

    act(() => result.current.update(() => ({ 2: greeting('Mine.') })))
    act(() => result.current.save())

    await waitFor(() => expect(result.current.status).toBe('conflict'))
    expect(result.current.isDirty).toBe(true)
    expect(stored()).toBeNull()
  })

  it('resets by removing from the server what was written, for every week', async () => {
    // The server keeps two weeks' conversations, which the editor opens with.
    vi.mocked(apiRequest).mockImplementation((async (path: string) =>
      path === '/admin/lessons'
        ? {
            pieces: [
              { week: 1, kind: 'dialogue', value: greeting(), version: 3 },
              { week: 2, kind: 'dialogue', value: greeting('Hi!'), version: 1 },
            ],
          }
        : null) as typeof apiRequest)
    await ensureAllLessonContent()
    const { result } = dialogues()
    expect(result.current.value).toEqual({ 1: greeting(), 2: greeting('Hi!') })

    act(() => result.current.resetToDefaults())

    await waitFor(() => expect(result.current.status).toBe('reset'))
    // Each from the version that was there: not on the word of someone who has not seen it.
    expect(sent().map(({ method, path }) => `${method} ${path}`)).toEqual([
      'DELETE /admin/lessons/weeks/1/dialogue?version=3',
      'DELETE /admin/lessons/weeks/2/dialogue?version=1',
    ])
    expect(stored()).toBeNull()
  })
})
