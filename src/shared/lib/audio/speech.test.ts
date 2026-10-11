import { waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { installFakeSound, removeFakeSound, TEST_VOICES, type FakeSound } from '@/test/fakeSound'
import {
  cancelSpeech,
  hasVoiceFor,
  isSpeechSupported,
  onSpeechActivity,
  soundUrl,
  speak,
  speakAll,
  SpeechError,
  type SpeechActivity,
} from './speech'
import { useVoiceStore } from './useVoiceStore'

let sound: FakeSound

const started = (count: number) => waitFor(() => expect(sound.played).toHaveLength(count))

beforeEach(() => {
  localStorage.clear()
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  sound = installFakeSound()
})

afterEach(() => {
  removeFakeSound()
})

describe('speak', () => {
  it('plays the server’s sound of the text, in the voice of the learner’s tutor', async () => {
    const said = speak('Hello! Good morning.')
    await started(1)

    // The tutor is the male one until the learner chooses.
    expect(sound.played).toEqual([{ text: 'Hello! Good morning.', voice: 'am_michael', rate: 1 }])
    sound.endSound()
    await expect(said).resolves.toBe('ended')
  })

  it('uses the voice the learner set for their tutor, and the other tutor’s when theirs changes', async () => {
    useVoiceStore.setState({ voices: { en: { male: 'bm_george', female: 'bf_emma' } } })
    void speak('One.')
    await started(1)
    useTutorAvatarStore.setState({ avatar: 'female' })
    void speak('Two.')
    await started(2)

    expect(sound.played.map((played) => played.voice)).toEqual(['bm_george', 'bf_emma'])
  })

  it('says a text in one voice when asked to, whatever the learner chose', async () => {
    void speak('A sample.', { voiceId: 'af_bella' })
    await started(1)

    expect(sound.played[0]?.voice).toBe('af_bella')
  })

  it('says a Hindi text in a Hindi voice', async () => {
    void speak('नमस्ते!', { lang: 'hi' })
    await started(1)

    expect(sound.played[0]).toEqual({ text: 'नमस्ते!', voice: 'hm_omega', rate: 1 })
  })

  it('plays the same sound slower when asked to, at its own pitch, without asking the server again', async () => {
    const first = speak('Nice to meet you.')
    await started(1)
    sound.endSound()
    await first
    void speak('Nice to meet you.', { rate: 0.75 })
    await started(2)

    expect(sound.played[1]?.rate).toBe(0.75)
    expect(sound.fetched).toHaveLength(1)
  })

  it('says a Bengali text in a Bengali voice', async () => {
    void speak('নমস্কার!', { lang: 'bn' })
    await started(1)

    expect(sound.played[0]).toEqual({ text: 'নমস্কার!', voice: 'bn_omega', rate: 1 })
  })

  it('has nothing to say a Tamil text with, and says so rather than use another voice', async () => {
    const said = speak('வணக்கம்!', { lang: 'ta' })

    await expect(said).rejects.toMatchObject({ name: 'SpeechError', reason: 'unsupported' })
    expect(sound.fetched).toEqual([])
    expect(sound.played).toEqual([])
  })

  it('fails when the server cannot be reached, and asks again the next time', async () => {
    sound.serverUp(false)
    await expect(speak('Hello.')).rejects.toBeInstanceOf(SpeechError)

    sound.serverUp(true)
    void speak('Hello.')
    await started(1)
    expect(sound.played[0]?.text).toBe('Hello.')
  })

  it('fails when the player cannot play what it was given', async () => {
    const said = speak('Hello.')
    await started(1)
    sound.breakSound()

    await expect(said).rejects.toMatchObject({ reason: 'failed' })
  })
})

describe('speakAll', () => {
  it('says the parts one after another, telling which is being said', async () => {
    const onPartStart = vi.fn()
    const said = speakAll([{ text: 'One.' }, { text: 'Two.' }], { onPartStart })

    await started(1)
    expect(onPartStart).toHaveBeenLastCalledWith(0)
    sound.endSound()
    await started(2)
    expect(onPartStart).toHaveBeenLastCalledWith(1)
    sound.endSound()

    await expect(said).resolves.toBe('ended')
    expect(sound.played.map((played) => played.text)).toEqual(['One.', 'Two.'])
  })

  it('fetches the later parts while the first is said, in the order they will be heard', async () => {
    void speakAll([{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }])
    await started(1)

    // The first is still playing; the rest are already there.
    await waitFor(() =>
      expect(sound.fetched.map((fetched) => fetched.text)).toEqual(['One.', 'Two.', 'Three.']),
    )
    expect(sound.played).toHaveLength(1)
  })

  it('asks for nothing more once it has been stopped', async () => {
    sound.serverUp(false)
    const said = speakAll([{ text: 'One.' }, { text: 'Two.' }, { text: 'Three.' }])
    await expect(said).rejects.toBeInstanceOf(SpeechError)
    sound.serverUp(true)
    await new Promise((resolve) => setTimeout(resolve, 20))

    // The first could not be fetched, which ended it: the rest were not worth asking for.
    expect(sound.fetched).toEqual([])
  })

  it('gives two speakers the two tutors’ voices', async () => {
    void speakAll([
      { text: 'Hello!', speaker: 0 },
      { text: 'Good morning!', speaker: 1 },
      { text: 'How are you?', speaker: 0 },
    ])
    await started(1)

    await waitFor(() =>
      expect(sound.fetched.map((fetched) => fetched.voice)).toEqual([
        'am_michael',
        'af_heart',
        'am_michael',
      ]),
    )
  })

  it('has nothing to do for no parts', async () => {
    await expect(speakAll([])).resolves.toBe('ended')
    expect(sound.fetched).toEqual([])
  })
})

describe('cancelSpeech', () => {
  it('stops what is being said, which then counts as cancelled, not as heard', async () => {
    const said = speakAll([{ text: 'One.' }, { text: 'Two.' }])
    await started(1)

    cancelSpeech()

    await expect(said).resolves.toBe('cancelled')
    expect(sound.paused()).toBe(true)
    // The line that was waiting its turn is never played.
    sound.endSound()
    expect(sound.played).toHaveLength(1)
  })

  it('is what a new text does to the one before it', async () => {
    const first = speak('One.')
    await started(1)
    void speak('Two.')

    await expect(first).resolves.toBe('cancelled')
    await started(2)
  })
})

describe('what a talking face is told', () => {
  it('hears each part start, with its text and speed, and the end', async () => {
    const heard: SpeechActivity[] = []
    const stop = onSpeechActivity((activity) => heard.push(activity))

    const said = speakAll([{ text: 'One.' }, { text: 'Two.' }], { rate: 0.75 })
    await started(1)
    sound.endSound()
    await started(2)
    sound.endSound()
    await said
    stop()

    expect(heard).toEqual([
      { type: 'start', text: 'One.', rate: 0.75 },
      { type: 'start', text: 'Two.', rate: 0.75 },
      { type: 'end' },
    ])
  })
})

describe('what can be said', () => {
  it('is whatever the server has a voice for', () => {
    expect(isSpeechSupported()).toBe(true)
    expect(hasVoiceFor('en')).toBe(true)
    expect(hasVoiceFor('hi-IN')).toBe(true)
    expect(hasVoiceFor('bn')).toBe(true)
    expect(hasVoiceFor('ta')).toBe(false)
  })

  it('is nothing once the server has said it has no voices', () => {
    removeFakeSound()
    sound = installFakeSound([], { known: true })

    expect(isSpeechSupported()).toBe(false)
    expect(hasVoiceFor('en')).toBe(false)
  })

  it('is not ruled out while the server’s answer is on its way, and waits for it', async () => {
    removeFakeSound()
    sound = installFakeSound(TEST_VOICES, { known: false })

    // Nothing is called impossible yet; a language is offered only once it is known.
    expect(isSpeechSupported()).toBe(true)
    expect(hasVoiceFor('hi')).toBe(false)

    void speak('Hello.')
    await started(1)
    expect(sound.played[0]?.voice).toBe('am_michael')
    expect(hasVoiceFor('hi')).toBe(true)
  })
})

describe('soundUrl', () => {
  it('names a sound by its voice and its text, so the same sound is always at the same address', () => {
    expect(soundUrl('I’m fine, thank you. And you?', 'bf_emma')).toBe(
      '/api/speech/audio?voice=bf_emma&text=I%E2%80%99m+fine%2C+thank+you.+And+you%3F',
    )
  })
})
