import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSpeech, isSpeechSupported, pickEnglishVoice, speak, SpeechError } from './speech'

class FakeUtterance {
  voice: unknown = null
  lang = ''
  rate = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null

  constructor(readonly text: string) {}
}

const voice = (lang: string, localService = true) =>
  ({ lang, localService, name: lang }) as SpeechSynthesisVoice

let voices: SpeechSynthesisVoice[] = []
const synth = {
  speak: vi.fn<(utterance: FakeUtterance) => void>(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => voices),
}
const spoken = () => {
  const utterance = synth.speak.mock.lastCall?.[0]
  if (!utterance) throw new Error('nothing was spoken')
  return utterance
}

beforeEach(() => {
  voices = [voice('hi-IN'), voice('en-US'), voice('en-IN')]
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', synth)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('pickEnglishVoice', () => {
  it('prefers Indian English, and never picks another language', () => {
    expect(pickEnglishVoice(voices)?.lang).toBe('en-IN')
    expect(pickEnglishVoice([voice('hi-IN'), voice('bn-IN')])).toBeUndefined()
  })

  it('prefers a voice on the device over one that needs the network', () => {
    expect(pickEnglishVoice([voice('en-IN', false), voice('en-GB', true)])?.lang).toBe('en-GB')
  })
})

describe('speak', () => {
  it('says the text with the chosen voice and speed, and resolves when it ends', async () => {
    const result = speak('Hello there.', { rate: 0.75 })
    const utterance = spoken()

    expect(synth.cancel).toHaveBeenCalledOnce()
    expect(utterance.text).toBe('Hello there.')
    expect(utterance.voice).toMatchObject({ lang: 'en-IN' })
    expect(utterance.lang).toBe('en-IN')
    expect(utterance.rate).toBe(0.75)

    utterance.onstart?.()
    utterance.onend?.()
    await expect(result).resolves.toBe('ended')
  })

  it('still speaks English when the voices have not loaded yet', () => {
    voices = []
    void speak('Hello.')
    expect(spoken().voice).toBeNull()
    expect(spoken().lang).toBe('en-US')
  })

  it('reports a playback that was stopped as cancelled, not as a failure', async () => {
    const result = speak('Hello.')
    spoken().onerror?.({ error: 'interrupted' })
    await expect(result).resolves.toBe('cancelled')
  })

  it('rejects when the device fails to speak', async () => {
    const result = speak('Hello.')
    spoken().onerror?.({ error: 'synthesis-failed' })
    await expect(result).rejects.toMatchObject({ reason: 'failed' })
  })

  it('rejects when nothing starts — a device with no usable voice stays silent', async () => {
    vi.useFakeTimers()
    const result = speak('Hello.')
    const outcome = expect(result).rejects.toBeInstanceOf(SpeechError)
    await vi.advanceTimersByTimeAsync(4000)
    await outcome
    expect(synth.cancel).toHaveBeenCalledTimes(2)
  })

  it('does not time out once speech has started, however long it is', async () => {
    vi.useFakeTimers()
    const result = speak('A long sentence.')
    spoken().onstart?.()
    await vi.advanceTimersByTimeAsync(60_000)
    spoken().onend?.()
    await expect(result).resolves.toBe('ended')
  })
})

describe('without speech synthesis', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('says so instead of throwing', async () => {
    expect(isSpeechSupported()).toBe(false)
    await expect(speak('Hello.')).rejects.toMatchObject({ reason: 'unsupported' })
    expect(() => cancelSpeech()).not.toThrow()
  })
})
