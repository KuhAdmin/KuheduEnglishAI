import { describe, expect, it } from 'vitest'
import { TEST_VOICES, testVoice } from '@/test/fakeSound'
import { baseLanguage, voiceForFace, voiceForSpeaker, voicesFor } from './voices'

const ids = (voices: readonly { id: string }[]) => voices.map((voice) => voice.id)

describe('voicesFor', () => {
  it('gives a language’s voices whatever their accent, in the server’s order', () => {
    expect(ids(voicesFor(TEST_VOICES, 'en'))).toEqual([
      'af_heart',
      'af_bella',
      'am_michael',
      'am_fenrir',
      'bf_emma',
      'bm_george',
    ])
    expect(ids(voicesFor(TEST_VOICES, 'hi-IN'))).toEqual(['hf_alpha', 'hm_omega'])
    expect(ids(voicesFor(TEST_VOICES, 'bn'))).toEqual(['bn_alpha', 'bn_omega'])
  })

  it('has none for a language the server does not speak', () => {
    expect(voicesFor(TEST_VOICES, 'ta')).toEqual([])
    expect(voicesFor([], 'en')).toEqual([])
  })
})

describe('voiceForFace', () => {
  it('gives each kind of tutor that kind’s default voice until one is chosen', () => {
    expect(voiceForFace(TEST_VOICES, 'en', 'female')?.id).toBe('af_heart')
    expect(voiceForFace(TEST_VOICES, 'en', 'male')?.id).toBe('am_michael')
    expect(voiceForFace(TEST_VOICES, 'hi', 'male')?.id).toBe('hm_omega')
    // A Bengali voice says whose it is in the list, not in its id.
    expect(voiceForFace(TEST_VOICES, 'bn', 'female')?.id).toBe('bn_alpha')
    expect(voiceForFace(TEST_VOICES, 'bn', 'male')?.id).toBe('bn_omega')
  })

  it('gives the voice that was chosen, whatever its kind or accent', () => {
    expect(voiceForFace(TEST_VOICES, 'en', 'male', 'bm_george')?.id).toBe('bm_george')
    // Any voice can be given to either tutor.
    expect(voiceForFace(TEST_VOICES, 'en', 'male', 'bf_emma')?.id).toBe('bf_emma')
  })

  it('passes over a choice the server does not offer, or one of another language', () => {
    // Saved while the app still spoke with the device's own voices.
    expect(voiceForFace(TEST_VOICES, 'en', 'female', 'Microsoft Heera - English (India)')?.id).toBe(
      'af_heart',
    )
    expect(voiceForFace(TEST_VOICES, 'en', 'female', 'hf_alpha')?.id).toBe('af_heart')
    // Bengali is said by Hindi's speakers, but a Hindi voice is still not a Bengali one.
    expect(voiceForFace(TEST_VOICES, 'bn', 'female', 'hf_alpha')?.id).toBe('bn_alpha')
  })

  it('falls back to the first of the kind, then to any voice, and to none where there is none', () => {
    const noDefaults = [testVoice('bf_emma', 'en-GB'), testVoice('bm_george', 'en-GB')]
    expect(voiceForFace(noDefaults, 'en', 'male')?.id).toBe('bm_george')
    expect(voiceForFace([testVoice('bm_george', 'en-GB')], 'en', 'female')?.id).toBe('bm_george')
    expect(voiceForFace(TEST_VOICES, 'ta', 'female')).toBeUndefined()
  })
})

describe('voiceForSpeaker', () => {
  const speaker = (index: number, tutor: 'female' | 'male' = 'male', chosen = {}) =>
    voiceForSpeaker(TEST_VOICES, 'en', tutor, chosen, index)?.id

  it('gives the first speaker the learner’s tutor’s voice and the second the other tutor’s', () => {
    expect([speaker(0), speaker(1)]).toEqual(['am_michael', 'af_heart'])
    expect([speaker(0, 'female'), speaker(1, 'female')]).toEqual(['af_heart', 'am_michael'])
  })

  it('uses the voices the learner chose for the two tutors', () => {
    const chosen = { male: 'bm_george', female: 'bf_emma' }
    expect([speaker(0, 'male', chosen), speaker(1, 'male', chosen)]).toEqual([
      'bm_george',
      'bf_emma',
    ])
  })

  it('gives a third and a fourth speaker other voices of the same kinds', () => {
    expect([speaker(2), speaker(3)]).toEqual(['am_fenrir', 'af_bella'])
    // No two alike while there are voices left; then they come round again.
    expect(new Set([0, 1, 2, 3].map((index) => speaker(index))).size).toBe(4)
    expect(speaker(8)).toBeDefined()
  })

  it('has no voice for a language the server does not speak', () => {
    expect(voiceForSpeaker(TEST_VOICES, 'ta', 'male', {}, 0)).toBeUndefined()
  })
})

describe('baseLanguage', () => {
  it('is the language without its region, however the tag is written', () => {
    expect(baseLanguage('en-GB')).toBe('en')
    expect(baseLanguage('hi_IN')).toBe('hi')
    expect(baseLanguage('BN')).toBe('bn')
  })
})
