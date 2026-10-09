import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cancelSpeech,
  hasVoiceFor,
  isSpeechSupported,
  onVoicesChanged,
  pickEnglishVoice,
  pickVoiceFor,
  speak,
  speakAll,
  SpeechError,
} from './speech'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { useVoiceStore } from './useVoiceStore'

class FakeUtterance {
  voice: unknown = null
  lang = ''
  rate = 1
  pitch = 1
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
  localStorage.clear()
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
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

describe('a voice for the learner’s own language', () => {
  it('is picked by the language, whatever the region, preferring one on the device', () => {
    const all = [voice('en-IN'), voice('bn-BD', false), voice('bn_IN'), voice('hi-IN')]
    expect(pickVoiceFor(all, 'bn')?.lang).toBe('bn_IN')
    expect(pickVoiceFor(all, 'hi-IN')?.lang).toBe('hi-IN')
    expect(pickVoiceFor(all, 'ta')).toBeUndefined()
  })

  it('is known to be there or not', () => {
    expect(hasVoiceFor('hi')).toBe(true)
    expect(hasVoiceFor('bn')).toBe(false)
  })

  it('says the text in that language instead of English', () => {
    void speak('आप कैसे हैं?', { lang: 'hi' })
    expect(spoken().voice).toMatchObject({ lang: 'hi-IN' })
    expect(spoken().lang).toBe('hi-IN')

    // Without a voice for it, the device is at least told which language the text is in.
    void speak('আপনি কেমন আছেন?', { lang: 'bn' })
    expect(spoken().voice).toBeNull()
    expect(spoken().lang).toBe('bn')
  })

  it('tells a listener when the voices have loaded, until it stops listening', () => {
    const listeners = new Set<() => void>()
    vi.stubGlobal('speechSynthesis', {
      ...synth,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    })
    const listener = vi.fn()

    const stop = onVoicesChanged(listener)
    expect(listeners).toEqual(new Set([listener]))
    stop()
    expect(listeners.size).toBe(0)
  })

  it('has nothing to listen to on a browser without that event', () => {
    expect(() => onVoicesChanged(vi.fn())()).not.toThrow()
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

describe('speakAll', () => {
  const queued = () => synth.speak.mock.calls.map(([utterance]) => utterance)

  it('hands every part to the device at once, each with its own pitch', () => {
    void speakAll(
      [{ text: 'Hello!', pitch: 1.1 }, { text: 'Good morning!', pitch: 0.85 }, { text: 'Bye.' }],
      { rate: 0.75 },
    )

    // All inside the call, because iOS only lets speech start from the tap that asked for it.
    expect(queued().map((utterance) => utterance.text)).toEqual(['Hello!', 'Good morning!', 'Bye.'])
    expect(queued().map((utterance) => utterance.pitch)).toEqual([1.1, 0.85, 1])
    expect(queued().every((utterance) => utterance.rate === 0.75)).toBe(true)
    expect(queued().every((utterance) => utterance.lang === 'en-IN')).toBe(true)
  })

  it('says which part is starting, and ends only after the last one', async () => {
    const started: number[] = []
    let outcome: string | undefined
    void speakAll([{ text: 'One.' }, { text: 'Two.' }], {
      onPartStart: (index) => started.push(index),
    }).then((result) => {
      outcome = result
    })
    const [first, second] = queued()

    first?.onstart?.()
    first?.onend?.()
    await Promise.resolve()
    expect(outcome).toBeUndefined()

    second?.onstart?.()
    second?.onend?.()
    await Promise.resolve()
    expect(started).toEqual([0, 1])
    expect(outcome).toBe('ended')
  })

  it('is cancelled by cancelSpeech, whatever event the browser then fires', async () => {
    const started: number[] = []
    const result = speakAll([{ text: 'One.' }, { text: 'Two.' }], {
      onPartStart: (index) => started.push(index),
    })
    const [first, second] = queued()
    first?.onstart?.()

    cancelSpeech()
    // Safari reports a cancelled utterance as ended; that must not count as heard.
    first?.onend?.()
    second?.onstart?.()
    second?.onend?.()

    await expect(result).resolves.toBe('cancelled')
    expect(started).toEqual([0])
  })

  it('cancels what was being said when something new is asked for', async () => {
    const first = speakAll([{ text: 'One.' }, { text: 'Two.' }])
    const second = speakAll([{ text: 'Three.' }])

    await expect(first).resolves.toBe('cancelled')
    queued().at(-1)?.onend?.()
    await expect(second).resolves.toBe('ended')
  })

  it('rejects when any part fails, and has nothing to do for an empty list', async () => {
    const result = speakAll([{ text: 'One.' }, { text: 'Two.' }])
    queued()[1]?.onerror?.({ error: 'synthesis-failed' })
    await expect(result).rejects.toMatchObject({ reason: 'failed' })

    synth.speak.mockClear()
    await expect(speakAll([])).resolves.toBe('ended')
    expect(synth.speak).not.toHaveBeenCalled()
  })
})

describe('the voice of the learner’s tutor', () => {
  const named = (lang: string, voiceURI: string) =>
    ({ lang, localService: true, name: voiceURI, voiceURI }) as SpeechSynthesisVoice
  const saidBy = (text: string, options = {}) => {
    void speak(text, options)
    return spoken().voice
  }

  beforeEach(() => {
    voices = [
      named('en-IN', 'heera'),
      named('en-IN', 'ravi'),
      named('en-US', 'zira'),
      named('hi-IN', 'hindi'),
    ]
  })

  it('is a man’s for the male tutor and a woman’s for the female, before any is chosen', () => {
    // The male tutor is the learner's until they choose.
    expect(saidBy('Hello.')).toMatchObject({ voiceURI: 'ravi' })

    useTutorAvatarStore.getState().setAvatar('female')
    expect(saidBy('Hello.')).toMatchObject({ voiceURI: 'heera' })
  })

  it('is the one chosen for that tutor, each tutor and each language keeping its own', () => {
    // Any voice can be given to either tutor.
    useVoiceStore.getState().setVoice('en', 'male', 'heera')
    useVoiceStore.getState().setVoice('en', 'female', 'zira')

    expect(saidBy('Hello.')).toMatchObject({ voiceURI: 'heera' })
    expect(saidBy('नमस्ते', { lang: 'hi' })).toMatchObject({ voiceURI: 'hindi' })

    useTutorAvatarStore.getState().setAvatar('female')
    expect(saidBy('Hello.')).toMatchObject({ voiceURI: 'zira' })
  })

  it('is passed over once the device no longer has it', () => {
    useVoiceStore.getState().setVoice('en', 'male', 'a voice that was uninstalled')

    expect(saidBy('Hello.')).toMatchObject({ voiceURI: 'ravi' })
  })

  it('gives way to a voice that is being tried out', () => {
    expect(saidBy('Hello.', { voiceURI: 'zira' })).toMatchObject({ voiceURI: 'zira' })
    // A voice of another language is never used for this one.
    expect(saidBy('Hello.', { voiceURI: 'hindi' })).toMatchObject({ voiceURI: 'ravi' })
  })
})

describe('without speech synthesis', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('says so instead of throwing', async () => {
    expect(isSpeechSupported()).toBe(false)
    expect(hasVoiceFor('hi')).toBe(false)
    expect(() => onVoicesChanged(vi.fn())()).not.toThrow()
    await expect(speak('Hello.')).rejects.toMatchObject({ reason: 'unsupported' })
    expect(() => cancelSpeech()).not.toThrow()
  })
})
