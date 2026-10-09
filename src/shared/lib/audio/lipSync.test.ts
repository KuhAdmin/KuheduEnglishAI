import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mouthShapesFor } from './lipSync'
import { cancelSpeech, onSpeechActivity, speak, speakAll, type SpeechActivity } from './speech'
import { useLipSync } from './useLipSync'
import { useVoiceStore } from './useVoiceStore'

class FakeUtterance {
  voice: unknown = null
  lang = ''
  rate = 1
  pitch = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onboundary: ((event: { name?: string; charIndex: number; charLength?: number }) => void) | null =
    null

  constructor(readonly text: string) {}
}

const synth = {
  speak: vi.fn<(utterance: FakeUtterance) => void>(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => []),
}
const utterance = (index = 0) => {
  const found = synth.speak.mock.calls[index]?.[0]
  if (!found) throw new Error('nothing was spoken')
  return found
}

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
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', synth)
  stubReducedMotion(false)
})

afterEach(() => {
  cancelSpeech()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
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

describe('onSpeechActivity', () => {
  it('tells when a text starts, each word the device reports, and when it is over', async () => {
    const heard: SpeechActivity[] = []
    const stop = onSpeechActivity((activity) => heard.push(activity))

    const result = speak('Good morning', { rate: 0.75 })
    utterance().onstart?.()
    utterance().onboundary?.({ name: 'word', charIndex: 0, charLength: 4 })
    // Some devices give no length; a sentence boundary is not a word.
    utterance().onboundary?.({ name: 'word', charIndex: 5 })
    utterance().onboundary?.({ name: 'sentence', charIndex: 0, charLength: 12 })
    utterance().onend?.()
    await result

    expect(heard).toEqual([
      { type: 'start', text: 'Good morning', rate: 0.75 },
      { type: 'word', word: 'Good', rate: 0.75 },
      { type: 'word', word: 'morning', rate: 0.75 },
      { type: 'end' },
    ])

    stop()
    void speak('Again')
    utterance(1).onstart?.()
    expect(heard).toHaveLength(4)
  })

  it('says it is over when speech is cancelled, and once only', async () => {
    const heard: SpeechActivity[] = []
    const stop = onSpeechActivity((activity) => heard.push(activity))

    const result = speakAll([{ text: 'One.' }, { text: 'Two.' }])
    utterance(0).onstart?.()
    cancelSpeech()
    utterance(0).onerror?.({ error: 'interrupted' })
    await result

    expect(heard.map(({ type }) => type)).toEqual(['start', 'end'])
    stop()
  })
})

describe('useLipSync', () => {
  beforeEach(() => vi.useFakeTimers())

  const say = (text: string) => {
    void speak(text)
    const said = utterance(synth.speak.mock.calls.length - 1)
    act(() => said.onstart?.())
    return said
  }
  const frame = (count = 1) => act(() => vi.advanceTimersByTime(85 * count))

  it('rests until the device speaks, then runs through the shapes of the text', () => {
    const { result } = renderHook(() => useLipSync())
    expect(result.current).toBe('rest')

    const said = say('map')
    expect(result.current).toBe('closed')
    frame()
    expect(result.current).toBe('open')
    frame()
    expect(result.current).toBe('closed')

    act(() => said.onend?.())
    expect(result.current).toBe('rest')
  })

  it('keeps talking when the voice takes longer than the text suggests', () => {
    const { result } = renderHook(() => useLipSync())
    say('a')
    expect(result.current).toBe('open')

    const shapes = new Set<string>()
    for (let index = 0; index < 8; index += 1) {
      frame()
      shapes.add(result.current)
    }
    expect(shapes.has('rest')).toBe(false)
    expect(shapes.size).toBeGreaterThan(1)
  })

  it('follows the words on a device that says when each one begins', () => {
    const { result } = renderHook(() => useLipSync())
    const said = say('we map')
    frame()

    act(() => said.onboundary?.({ name: 'word', charIndex: 3, charLength: 3 }))
    expect(result.current).toBe('closed')
    frame()
    expect(result.current).toBe('open')
    frame()
    expect(result.current).toBe('closed')
    // The word is over and the next has not begun: the lips wait together, they do not chatter.
    frame(6)
    expect(result.current).toBe('closed')

    act(() => said.onend?.())
    expect(result.current).toBe('rest')
  })

  it('opens the mouth without moving it when motion is reduced', () => {
    stubReducedMotion(true)
    const { result } = renderHook(() => useLipSync())

    const said = say('Hello there')
    expect(result.current).toBe('mid')
    frame(5)
    expect(result.current).toBe('mid')

    act(() => said.onend?.())
    expect(result.current).toBe('rest')
  })

  it('stops listening when the face goes', () => {
    const { result, unmount } = renderHook(() => useLipSync())
    unmount()

    say('map')
    expect(result.current).toBe('rest')
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
  })
})
