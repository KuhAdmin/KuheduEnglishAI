/**
 * The device's voices, sorted and grouped for a learner to choose from (Profile › Voice settings).
 * Pure: it is handed the voices, so it runs the same in a test as on a phone.
 */

/** `other` is a voice that does not say which it is: the browser has no field for it. */
export type VoiceGender = 'female' | 'male' | 'other'

export const VOICE_GENDERS = ['female', 'male', 'other'] as const satisfies readonly VoiceGender[]

/** The two kinds of tutor a voice can be chosen for; any voice can be given to either. */
export type VoiceKind = Exclude<VoiceGender, 'other'>

export const VOICE_KINDS = ['male', 'female'] as const satisfies readonly VoiceKind[]

/** A voice a learner can choose. */
export type VoiceChoice = {
  /** The voice's `voiceURI`: what a choice is saved as. */
  id: string
  /** What the voice is called on screen: the device's name for it, without the padding. */
  name: string
  voice: SpeechSynthesisVoice
  gender: VoiceGender
}

export const baseLanguage = (tag: string) => tag.toLowerCase().split(/[-_]/)[0] ?? ''

const region = (tag: string) => tag.toLowerCase().split(/[-_]/)[1] ?? ''

/** Indian voices first: they are what learners hear around them. */
const accentRank = (lang: string) => {
  const accent = region(lang)
  if (accent === 'in') return 0
  if (accent === 'gb') return 1
  if (accent === 'us') return 2
  return 3
}

/**
 * The device's voices for a language, best first: on-device voices win (they also work
 * offline), then the accent. The first one is what the app speaks with by itself.
 */
export function voicesFor(
  voices: readonly SpeechSynthesisVoice[],
  language: string,
): SpeechSynthesisVoice[] {
  const wanted = baseLanguage(language)
  const seen = new Set<string>()
  return (
    voices
      .filter((voice) => baseLanguage(voice.lang) === wanted)
      // Some devices list a voice twice; a choice could not tell the two apart.
      .filter((voice) => {
        if (!voice.voiceURI) return true
        if (seen.has(voice.voiceURI)) return false
        seen.add(voice.voiceURI)
        return true
      })
      .sort(
        (a, b) =>
          Number(b.localService) - Number(a.localService) ||
          accentRank(a.lang) - accentRank(b.lang),
      )
  )
}

// Voices that are named after a person, as Windows, Apple and Edge name theirs. Only names whose
// voice is known are listed: a name not here is "other", never a guess.
const names = (list: string) => new Set(list.split(/\s+/).filter(Boolean))
const FEMALE_VOICES = names(`
  heera zira hazel susan linda catherine kalpana swara neerja tanishaa nabanita aria jenny sonia
  libby natasha clara michelle samantha veena lekha karen moira tessa victoria kate serena
  allison ava fiona nicky sangeeta isha kiyara piya zoe martha emma mia ana sara nancy jane amber
  ashley cora elizabeth monica maisie molly abbi bella hollie olivia leah luna ananya shruti
  pallavi flo sandy shelley grandma kathy princess vicki
`)
const MALE_VOICES = names(`
  ravi david mark george james richard sean hemant madhur prabhat bashkar pradeep guy ryan
  william liam mitchell thomas daniel rishi alex fred oliver tom aaron arthur gordon lee ralph
  albert bruce junior evan nathan eddy reed rocko grandpa neel christopher eric roger steffan
  brian andrew davis tony jason jacob brandon connor luke noah ethan alfie elliot darren duncan
  sam wayne kunal rehaan aarav madhav valluvar mohan
`)
// Chrome's own voices are named after their language, not a person.
const NAMED_BY_LANGUAGE: Record<string, VoiceGender> = {
  'google us english': 'female',
  'google हिन्दी': 'female',
}

/**
 * Whether a voice is a woman's or a man's, read from its name — the only place a browser says
 * it, and only sometimes: many phones call a voice "English India" and nothing more.
 */
export function voiceGender(name: string): VoiceGender {
  const lowered = name.toLowerCase()
  if (/\bfemale\b/.test(lowered)) return 'female'
  if (/\bmale\b/.test(lowered)) return 'male'

  const byLanguage = NAMED_BY_LANGUAGE[lowered.trim()]
  if (byLanguage) return byLanguage

  for (const word of lowered.split(/[^\p{L}]+/u)) {
    // Edge joins the two: "AvaMultilingual".
    const person = word.replace(/multilingual$/, '')
    if (FEMALE_VOICES.has(person)) return 'female'
    if (MALE_VOICES.has(person)) return 'male'
  }
  return 'other'
}

/**
 * The device's name for a voice, cut down to the part that tells it from the others: "David"
 * from "Microsoft David - English (United States)", "Neerja" from "Microsoft Neerja Online
 * (Natural) - English (India)". The maker's name is kept where it is the name ("Google UK English
 * Male"), and what is cut is said elsewhere: the accent and "Needs internet" are on the row.
 */
export function shortVoiceName(name: string): string {
  const short = (name.split(' - ')[0] ?? name)
    .replace(/^Microsoft\s+/i, '')
    .replace(/\s+Online(\s+\(Natural\))?$/i, '')
    .trim()
  return short || name
}

/**
 * The voices a learner can choose from for a language, best first, each with its group. Two
 * voices whose short names would read the same keep their full ones.
 */
export function voiceChoices(
  voices: readonly SpeechSynthesisVoice[],
  language: string,
): VoiceChoice[] {
  const offered = voicesFor(voices, language)
  const count = new Map<string, number>()
  for (const voice of offered) {
    const short = shortVoiceName(voice.name)
    count.set(short, (count.get(short) ?? 0) + 1)
  }

  return offered.map((voice) => {
    const short = shortVoiceName(voice.name)
    return {
      id: voice.voiceURI,
      name: count.get(short) === 1 ? short : voice.name,
      voice,
      gender: voiceGender(voice.name),
    }
  })
}

/**
 * The voice a tutor of one kind speaks with: the one the learner chose for that kind, whatever
 * it is, if the device still has it; else the device's first voice of that kind, so that a
 * woman's face is not given a man's voice where there is a choice; else the device's best.
 */
export function voiceForFace(
  voices: readonly SpeechSynthesisVoice[],
  language: string,
  kind: VoiceKind,
  chosenId?: string,
): VoiceChoice | undefined {
  const choices = voiceChoices(voices, language)
  return (
    choices.find((choice) => choice.id === chosenId) ??
    choices.find((choice) => choice.gender === kind) ??
    choices[0]
  )
}
