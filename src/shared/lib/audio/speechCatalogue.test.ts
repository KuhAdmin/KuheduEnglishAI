import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeSound, removeFakeSound, TEST_VOICES, testVoice } from '@/test/fakeSound'
import {
  loadSpeechVoices,
  onSpeechVoicesChanged,
  resetSpeechVoices,
  speechVoices,
  speechVoicesKnown,
} from './speechCatalogue'

const saved = () => JSON.parse(localStorage.getItem('kuhedu-speech-voices') ?? 'null') as unknown

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  removeFakeSound()
})

describe('the server’s voices', () => {
  it('are asked for once, told to whoever listens, and kept for the next visit', async () => {
    installFakeSound(TEST_VOICES, { known: false })
    const told = vi.fn()
    const stop = onSpeechVoicesChanged(told)
    expect(speechVoicesKnown()).toBe(false)

    await Promise.all([loadSpeechVoices(), loadSpeechVoices()])
    await loadSpeechVoices()
    stop()

    expect(speechVoices()).toEqual(TEST_VOICES)
    expect(speechVoicesKnown()).toBe(true)
    expect(told).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledOnce()
    expect(saved()).toEqual({ voices: TEST_VOICES })
  })

  it('stay as they were known when the server cannot be reached', async () => {
    const sound = installFakeSound(TEST_VOICES, { known: false })
    resetSpeechVoices([testVoice('af_heart', 'en-US', true)], false)
    sound.serverUp(false)

    await loadSpeechVoices()

    expect(speechVoices().map((voice) => voice.id)).toEqual(['af_heart'])
    // Not asked again at once: a screen that re-renders must not hammer a server that is down.
    await loadSpeechVoices()
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('stay as they were known when the server answers that it cannot speak right now', async () => {
    installFakeSound([], { known: false })
    resetSpeechVoices(TEST_VOICES, false)

    await loadSpeechVoices()

    // The sounds already made are still served, so the voices are still worth knowing.
    expect(speechVoices()).toEqual(TEST_VOICES)
  })

  it('are an unchanged list for as long as the voices are the same', async () => {
    installFakeSound(TEST_VOICES, { known: false })
    resetSpeechVoices(TEST_VOICES, false)
    const before = speechVoices()

    await loadSpeechVoices()

    expect(speechVoices()).toBe(before)
  })
})
