import { beforeEach, describe, expect, it } from 'vitest'
import { useVoiceStore } from './useVoiceStore'
import { shortVoiceName, voiceChoices, voiceForFace, voiceGender, voicesFor } from './voices'

const voice = (name: string, lang: string, localService = true) =>
  ({ name, lang, localService, voiceURI: name }) as SpeechSynthesisVoice

describe('voiceGender', () => {
  it('reads it from a voice that says so in its name', () => {
    expect(voiceGender('Google UK English Female')).toBe('female')
    expect(voiceGender('Google UK English Male')).toBe('male')
  })

  it('knows the voices that are named after a person', () => {
    expect(voiceGender('Microsoft Heera - English (India)')).toBe('female')
    expect(voiceGender('Microsoft Ravi - English (India)')).toBe('male')
    expect(voiceGender('Microsoft Neerja Online (Natural) - English (India)')).toBe('female')
    expect(voiceGender('Samantha')).toBe('female')
    expect(voiceGender('Rishi (Enhanced)')).toBe('male')
    expect(voiceGender('Google हिन्दी')).toBe('female')
    // Edge joins the name to a word.
    expect(
      voiceGender('Microsoft AvaMultilingual Online (Natural) - English (United States)'),
    ).toBe('female')
    expect(voiceGender('Microsoft AndrewMultilingual Online (Natural)')).toBe('male')
  })

  it('does not guess for a voice named after its language only', () => {
    expect(voiceGender('English India')).toBe('other')
    expect(voiceGender('en-in-x-ene-network')).toBe('other')
    expect(voiceGender('Bangla Bangladesh')).toBe('other')
  })
})

describe('voicesFor', () => {
  const all = [
    voice('US', 'en-US'),
    voice('Network India', 'en-IN', false),
    voice('Hindi', 'hi-IN'),
    voice('UK', 'en_GB'),
    voice('India', 'en-IN'),
  ]

  it('keeps one language, on-device voices first, then Indian accents', () => {
    expect(voicesFor(all, 'en').map(({ name }) => name)).toEqual([
      'India',
      'UK',
      'US',
      'Network India',
    ])
    expect(voicesFor(all, 'hi-IN').map(({ name }) => name)).toEqual(['Hindi'])
    expect(voicesFor(all, 'bn')).toEqual([])
  })

  it('lists a voice the device repeats only once', () => {
    expect(voicesFor([voice('India', 'en-IN'), voice('India', 'en-IN')], 'en')).toHaveLength(1)
  })
})

describe('shortVoiceName', () => {
  it('keeps the part of the device’s name that tells a voice from the others', () => {
    expect(shortVoiceName('Microsoft David - English (United States)')).toBe('David')
    expect(shortVoiceName('Microsoft Neerja Online (Natural) - English (India)')).toBe('Neerja')
    expect(shortVoiceName('Microsoft Zira Desktop - English (United States)')).toBe('Zira Desktop')
  })

  it('leaves a name that has nothing to cut', () => {
    expect(shortVoiceName('Google UK English Male')).toBe('Google UK English Male')
    expect(shortVoiceName('Google हिन्दी')).toBe('Google हिन्दी')
    expect(shortVoiceName('Samantha')).toBe('Samantha')
    expect(shortVoiceName('English India')).toBe('English India')
    expect(shortVoiceName('Microsoft')).toBe('Microsoft')
  })
})

describe('voiceChoices', () => {
  const all = [
    voice('Microsoft Ravi - English (India)', 'en-IN'),
    voice('Microsoft Heera - English (India)', 'en-IN'),
    voice('English United States', 'en-US'),
    voice('Google UK English Female', 'en-GB', false),
    voice('English United Kingdom', 'en-GB'),
  ]

  it('lists a language’s voices, best first, each by its short name and in its group', () => {
    expect(voiceChoices(all, 'en').map((choice) => [choice.name, choice.gender])).toEqual([
      ['Ravi', 'male'],
      ['Heera', 'female'],
      ['English United Kingdom', 'other'],
      ['English United States', 'other'],
      ['Google UK English Female', 'female'],
    ])
  })

  it('keeps the full names of two voices that would otherwise read the same', () => {
    const twins = [
      voice('Microsoft Zira - English (United States)', 'en-US'),
      voice('Microsoft Zira - English (India)', 'en-IN'),
      voice('Microsoft David - English (United States)', 'en-US'),
    ]
    expect(voiceChoices(twins, 'en').map(({ name }) => name)).toEqual([
      'Microsoft Zira - English (India)',
      'Microsoft Zira - English (United States)',
      'David',
    ])
  })

  it('knows a voice by its `voiceURI`, which is what a choice is saved as', () => {
    const samantha = { ...voice('Samantha', 'en-US'), voiceURI: 'com.apple.samantha' }
    expect(voiceChoices([samantha], 'en')[0]?.id).toBe('com.apple.samantha')
  })
})

describe('voiceForFace', () => {
  const ravi = voice('Microsoft Ravi - English (India)', 'en-IN')
  const heera = voice('Microsoft Heera - English (India)', 'en-IN')
  const zira = voice('Microsoft Zira - English (United States)', 'en-US')
  const plain = voice('English India', 'en-IN')

  it('gives each kind of tutor the device’s first voice of that kind', () => {
    expect(voiceForFace([ravi, heera, zira], 'en', 'male')?.name).toBe('Ravi')
    expect(voiceForFace([ravi, heera, zira], 'en', 'female')?.name).toBe('Heera')
    // A voice known to suit wins over one that does not say what it is.
    expect(voiceForFace([plain, heera], 'en', 'female')?.name).toBe('Heera')
  })

  it('gives a tutor the voice chosen for it, whatever that voice is', () => {
    expect(voiceForFace([ravi, heera, zira], 'en', 'female', zira.voiceURI)?.name).toBe('Zira')
    expect(voiceForFace([ravi, heera], 'en', 'female', ravi.voiceURI)?.name).toBe('Ravi')
    expect(voiceForFace([plain, heera], 'en', 'male', plain.voiceURI)?.name).toBe('English India')
  })

  it('passes over a chosen voice the device no longer has', () => {
    expect(voiceForFace([ravi, heera], 'en', 'female', 'uninstalled')?.name).toBe('Heera')
  })

  it('falls back to the device’s best voice when it has none of the kind', () => {
    expect(voiceForFace([ravi], 'en', 'female')?.name).toBe('Ravi')
    expect(voiceForFace([plain], 'en', 'female')?.name).toBe('English India')
    expect(voiceForFace([], 'en', 'female')).toBeUndefined()
  })
})

describe('useVoiceStore', () => {
  const saved = () => JSON.parse(localStorage.getItem('kuhedu-voice') ?? '{}') as unknown

  beforeEach(() => {
    localStorage.clear()
    useVoiceStore.setState({ voices: {} })
  })

  it('keeps two voices per language, one for each kind of tutor', () => {
    useVoiceStore.getState().setVoice('en-IN', 'male', 'ravi')
    useVoiceStore.getState().setVoice('en', 'female', 'heera')
    useVoiceStore.getState().setVoice('bn', 'female', 'bangla')
    // Choosing again replaces that tutor's voice only.
    useVoiceStore.getState().setVoice('en', 'male', 'david')

    const voices = { en: { male: 'david', female: 'heera' }, bn: { female: 'bangla' } }
    expect(useVoiceStore.getState().voices).toEqual(voices)
    expect(saved()).toMatchObject({ state: { voices } })
  })

  it('keeps only what is a voice for a kind of tutor when reading what was saved', async () => {
    localStorage.setItem(
      'kuhedu-voice',
      JSON.stringify({
        state: {
          voices: {
            // From a build that had one voice per language: which tutor it was for is not known.
            en: 'ravi',
            hi: { female: 'hindi', male: 5, robot: 'x' },
            bn: {},
          },
        },
      }),
    )
    await useVoiceStore.persist.rehydrate()
    expect(useVoiceStore.getState().voices).toEqual({ hi: { female: 'hindi' } })

    localStorage.setItem('kuhedu-voice', JSON.stringify({ state: { voices: 'nonsense' } }))
    await useVoiceStore.persist.rehydrate()
    expect(useVoiceStore.getState().voices).toEqual({})
  })
})
