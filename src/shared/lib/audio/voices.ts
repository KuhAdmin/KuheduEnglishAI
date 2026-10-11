import { SPEECH_GENDERS, type SpeechGender, type SpeechVoice } from '@kuhedu/contracts'

/**
 * Picking a voice from the ones the server offers (Profile › Voice settings, and whatever
 * speaks). Pure: it is handed the voices, so it runs the same in a test as on a phone.
 *
 * A voice says what it is — its language with its accent, and whether it is a woman's or a
 * man's — so nothing here is guessed.
 */

/** The two kinds of voice, which are the two kinds of tutor; any voice can be given to either. */
export type VoiceKind = SpeechGender

/** In the order they are shown: female first. */
export const VOICE_KINDS = SPEECH_GENDERS

/** A voice a learner can choose. Its `id` is what a choice is saved as. */
export type VoiceChoice = SpeechVoice

export const baseLanguage = (tag: string) => tag.toLowerCase().split(/[-_]/)[0] ?? ''

/** The voices for a language, whatever their accent, in the server's order: best first. */
export function voicesFor(voices: readonly VoiceChoice[], language: string): VoiceChoice[] {
  const wanted = baseLanguage(language)
  return voices.filter((voice) => baseLanguage(voice.language) === wanted)
}

/**
 * The voice a tutor of one kind speaks with: the one the learner chose for that kind, whatever
 * it is, if it is still on offer; else the default of that kind, so that a woman's face is not
 * given a man's voice; else the first of that kind; else any.
 */
export function voiceForFace(
  voices: readonly VoiceChoice[],
  language: string,
  kind: VoiceKind,
  chosenId?: string,
): VoiceChoice | undefined {
  const offered = voicesFor(voices, language)
  const ofKind = offered.filter((voice) => voice.gender === kind)
  return (
    offered.find((voice) => voice.id === chosenId) ??
    ofKind.find((voice) => voice.default) ??
    ofKind[0] ??
    offered[0]
  )
}

const otherKind = (kind: VoiceKind): VoiceKind => (kind === 'female' ? 'male' : 'female')

/**
 * The voice of one speaker of several (a conversation), counted from 0. The first is the
 * learner's tutor, the second the other tutor, so two people talking are a woman and a man in
 * the voices the learner chose. Further speakers take further voices of the same kinds, so that
 * no two sound alike while there are voices left.
 */
export function voiceForSpeaker(
  voices: readonly VoiceChoice[],
  language: string,
  tutor: VoiceKind,
  chosen: Partial<Record<VoiceKind, string>>,
  speaker: number,
): VoiceChoice | undefined {
  const kind = speaker % 2 === 0 ? tutor : otherKind(tutor)
  const own = voiceForFace(voices, language, kind, chosen[kind])
  const round = Math.floor(speaker / 2)
  if (round === 0 || !own) return own

  const others = voicesFor(voices, language).filter(
    (voice) => voice.gender === own.gender && voice.id !== own.id,
  )
  return others[(round - 1) % Math.max(others.length, 1)] ?? own
}
