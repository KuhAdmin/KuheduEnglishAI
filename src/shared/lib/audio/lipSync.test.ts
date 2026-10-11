import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeSound, removeFakeSound, type FakeSound } from '@/test/fakeSound'
import { mouthShapesFor } from './lipSync'
import { cancelSpeech, speak } from './speech'
import { useLipSync } from './useLipSync'
import { useVoiceStore } from './useVoiceStore'

let sound: FakeSound

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced && query.includes('prefers-reduced-motion'),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

beforeEach(() => {
  localStorage.clear()
  useVoiceStore.setState({ voices: {} })
  sound = installFakeSound()
  stubReducedMotion(false)
})

afterEach(() => {
  vi.useRealTimers()
  removeFakeSound()
})

describe('mouthShapesFor', () => {
  it('reads the shapes off the spelling: vowels open the mouth, m, b and p close it', () => {
    expect(mouthShapesFor('map')).toEqual(['closed', 'open', 'closed'])
    expect(mouthShapesFor('we see you')).toEqual([
      'round',
      'mid',
      'closed',
      'mid',
      'closed',
      'wide',
      'round',
    ])
  })

  it('never holds one shape twice running, and closes the lips between words', () => {
    expect(mouthShapesFor('Hello, hello!')).toEqual(['mid', 'round', 'closed', 'mid', 'round'])
    expect(mouthShapesFor('  ...  ')).toEqual([])
  })

  it('reads an accented letter as the letter it is', () => {
    expect(mouthShapesFor('café')).toEqual(mouthShapesFor('cafe'))
  })

  it('keeps the mouth moving, the same way each time, in a script it has no table for', () => {
    const shapes = mouthShapesFor('নমস্কার')
    expect(shapes.length).toBeGreaterThan(1)
    expect(shapes).toEqual(mouthShapesFor('নমস্কার'))
    expect(shapes).not.toContain('rest')
  })
})

describe('useLipSync', () => {
  beforeEach(() => vi.useFakeTimers())

  /** Asks for a text and lets its sound be fetched and start. */
  const say = async (text: string) => {
    await act(async () => {
      void speak(text)
      await vi.advanceTimersByTimeAsync(0)
    })
  }
  const end = () =>
    act(async () => {
      sound.endSound()
      await vi.advanceTimersByTimeAsync(0)
    })
  const frame = (count = 1) => act(() => vi.advanceTimersByTime(85 * count))

  it('rests until the sound starts, then runs through the shapes of the text', async () => {
    const { result } = renderHook(() => useLipSync())
    expect(result.current).toBe('rest')

    await say('map')
    expect(result.current).toBe('closed')
    frame()
    expect(result.current).toBe('open')
    frame()
    expect(result.current).toBe('closed')

    await end()
    expect(result.current).toBe('rest')
  })

  it('keeps talking when the voice takes longer than the text suggests', async () => {
    const { result } = renderHook(() => useLipSync())
    await say('a')
    expect(result.current).toBe('open')

    const shapes = new Set<string>()
    for (let index = 0; index < 8; index += 1) {
      frame()
      shapes.add(result.current)
    }
    expect(shapes.has('rest')).toBe(false)
    expect(shapes.size).toBeGreaterThan(1)
  })

  it('comes to rest when the voice is stopped', async () => {
    const { result } = renderHook(() => useLipSync())
    await say('Hello there')
    expect(result.current).not.toBe('rest')

    act(() => cancelSpeech())
    expect(result.current).toBe('rest')
    frame(5)
    expect(result.current).toBe('rest')
  })

  it('opens the mouth without moving it when motion is reduced', async () => {
    stubReducedMotion(true)
    const { result } = renderHook(() => useLipSync())

    await say('Hello there')
    expect(result.current).toBe('mid')
    frame(5)
    expect(result.current).toBe('mid')

    await end()
    expect(result.current).toBe('rest')
  })

  it('stops listening when the face goes', async () => {
    const { result, unmount } = renderHook(() => useLipSync())
    unmount()

    await say('map')
    expect(result.current).toBe('rest')
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
  })
})
