import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeSound, removeFakeSound, TEST_VOICES, type FakeSound } from '@/test/fakeSound'
import { guessedMouth, mouthAt, mouthShapesFor } from './lipSync'
import { cancelSpeech, speak, speakAll } from './speech'
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
      'open',
      'closed',
      'mid',
      'open',
      'closed',
      'wide',
      'round',
    ])
  })

  it('never holds one shape twice running, and closes the lips between words', () => {
    expect(mouthShapesFor('Hello, hello!')).toEqual([
      'mid',
      'open',
      'mid',
      'round',
      'closed',
      'mid',
      'open',
      'mid',
      'round',
    ])
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

describe('mouthAt', () => {
  const marks = [
    { at: 0, shape: 'closed' },
    { at: 0.1, shape: 'open' },
    { at: 0.25, shape: 'wide' },
  ] as const

  it('gives the shape of the last mark reached', () => {
    expect(mouthAt(marks, 0)).toBe('closed')
    expect(mouthAt(marks, 0.099)).toBe('closed')
    expect(mouthAt(marks, 0.1)).toBe('open')
    expect(mouthAt(marks, 0.24)).toBe('open')
    expect(mouthAt(marks, 0.25)).toBe('wide')
    // The last shape is held to the end of the sound.
    expect(mouthAt(marks, 30)).toBe('wide')
  })

  it('keeps the lips together before the first mark, and where there are none', () => {
    expect(mouthAt([{ at: 0.2, shape: 'open' }], 0.1)).toBe('closed')
    expect(mouthAt([], 1)).toBe('closed')
  })
})

describe('guessedMouth', () => {
  it('spreads the shapes of the spelling evenly over the sound’s length', () => {
    expect(guessedMouth('map', 0.75)).toEqual([
      { at: 0, shape: 'closed' },
      { at: 0.25, shape: 'open' },
      { at: 0.5, shape: 'closed' },
    ])
  })

  it('goes at a usual pace while the length is not known', () => {
    const marks = guessedMouth('map', Number.NaN)
    expect(marks.map((mark) => mark.shape)).toEqual(['closed', 'open', 'closed'])
    expect(marks[1]?.at).toBeCloseTo(0.085)
  })

  it('opens the mouth for a text with no letters in it, which is still said', () => {
    expect(guessedMouth('50', 1)).toEqual([{ at: 0, shape: 'mid' }])
  })
})

describe('useLipSync', () => {
  beforeEach(() => vi.useFakeTimers())

  /** Asks for a text and lets its sound be fetched and start. */
  const say = async (text: string, rate = 1) => {
    await act(async () => {
      void speak(text, { rate })
      await vi.advanceTimersByTimeAsync(0)
    })
  }
  const end = () =>
    act(async () => {
      sound.endSound()
      await vi.advanceTimersByTimeAsync(0)
    })
  /** The clock goes on, and the player with it. */
  const pass = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  /** A server that sends this mouth with every sound. */
  const serverSends = (mouth: string) => {
    removeFakeSound()
    sound = installFakeSound(TEST_VOICES, { mouth })
    stubReducedMotion(false)
  }

  it('rests until the sound starts, then takes each shape at the moment the server gave for it', async () => {
    serverSends('0c100o250c400w')
    const { result } = renderHook(() => useLipSync())
    expect(result.current).toBe('rest')

    await say('map')
    expect(result.current).toBe('closed')
    pass(60)
    expect(result.current).toBe('closed')
    pass(60)
    expect(result.current).toBe('open')
    pass(150)
    expect(result.current).toBe('closed')
    pass(150)
    expect(result.current).toBe('wide')

    await end()
    expect(result.current).toBe('rest')
  })

  it('keeps time with a sound that is played slowly', async () => {
    serverSends('0c100o250c')
    const { result } = renderHook(() => useLipSync())

    await say('map', 0.5)
    // At half speed the sound is a tenth of a second in only after a fifth of one.
    pass(120)
    expect(result.current).toBe('closed')
    pass(120)
    expect(result.current).toBe('open')
  })

  it('follows each sound of several said in a row', async () => {
    serverSends('0c100o')
    const { result } = renderHook(() => useLipSync())

    await act(async () => {
      void speakAll([{ text: 'One.' }, { text: 'Two.' }])
      await vi.advanceTimersByTimeAsync(0)
    })
    pass(120)
    expect(result.current).toBe('open')

    // The second begins at its own beginning.
    await end()
    expect(result.current).toBe('closed')
    pass(120)
    expect(result.current).toBe('open')
  })

  it('guesses from the spelling, over the sound’s length, for a sound that came without a mouth', async () => {
    const { result } = renderHook(() => useLipSync())

    await say('map')
    expect(result.current).toBe('closed')
    // Now the player knows how long it is: three shapes over six tenths of a second.
    act(() => sound.lasts(0.6))
    pass(120)
    expect(result.current).toBe('closed')
    pass(120)
    expect(result.current).toBe('open')
    pass(200)
    expect(result.current).toBe('closed')
  })

  it('comes to rest when the voice is stopped', async () => {
    serverSends('0c100o250c')
    const { result } = renderHook(() => useLipSync())
    await say('Hello there')
    pass(120)
    expect(result.current).toBe('open')

    act(() => cancelSpeech())
    expect(result.current).toBe('rest')
    pass(400)
    expect(result.current).toBe('rest')
  })

  it('opens the mouth without moving it when motion is reduced', async () => {
    serverSends('0c100o250c')
    stubReducedMotion(true)
    const { result } = renderHook(() => useLipSync())

    await say('Hello there')
    expect(result.current).toBe('mid')
    pass(400)
    expect(result.current).toBe('mid')

    await end()
    expect(result.current).toBe('rest')
  })

  it('stops looking when the face goes', async () => {
    const { result, unmount } = renderHook(() => useLipSync())
    await say('map')
    unmount()

    expect(result.current).toBe('closed')
    expect(vi.getTimerCount()).toBe(0)
  })
})
