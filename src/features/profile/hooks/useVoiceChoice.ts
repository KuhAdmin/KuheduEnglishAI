import { useMemo, useState } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoices } from '@/shared/lib/audio/useVoices'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import {
  baseLanguage,
  voiceChoices,
  voiceForFace,
  VOICE_GENDERS,
  VOICE_KINDS,
  type VoiceChoice,
  type VoiceGender,
  type VoiceKind,
} from '@/shared/lib/audio/voices'
import { DEFAULT_LANGUAGE, isEnglish, useTFor } from '@/shared/lib/i18n'
import { useTutorVoiceKind } from '@/shared/lib/learner/tutorAvatar'

/**
 * Choosing the two voices the app speaks a language with, one for each kind of tutor: which
 * language, tutor and group of voices are on show, the voice picked (not saved until `save`),
 * trying one out, and saving it for the tutor on show.
 */
export function useVoiceChoice() {
  const haptic = useHaptics()
  const { languages: learnerLanguages } = useLanguagesConfig()
  const deviceVoices = useVoices()
  const allChosen = useVoiceStore((state) => state.voices)
  const setVoice = useVoiceStore((state) => state.setVoice)
  const playback = useSpeechPlayback()
  const ownTutor = useTutorVoiceKind()

  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  // The screen opens on the learner's own tutor.
  const [pickedTutor, setPickedTutor] = useState<VoiceKind | null>(null)
  const tutor = pickedTutor ?? ownTutor
  const [pickedGroup, setPickedGroup] = useState<VoiceGender | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  // The sample is content in the voice's language, whatever language the screen is in.
  const sample = useTFor(language)('voice.sample')

  // English is what the lessons speak, so it comes first, and is there even if an admin
  // removed it from the languages learners choose from.
  const languages = useMemo(
    () => [
      learnerLanguages.find(({ code }) => isEnglish(code)) ?? {
        code: DEFAULT_LANGUAGE,
        nativeName: 'English',
      },
      ...learnerLanguages.filter(({ code }) => !isEnglish(code)),
    ],
    [learnerLanguages],
  )

  const voices = useMemo(() => voiceChoices(deviceVoices, language), [deviceVoices, language])
  const chosen = allChosen[baseLanguage(language)]
  /** The voice each kind of tutor speaks with now: the one chosen for it, or the device's pick. */
  const voiceOf = (kind: VoiceKind) => voiceForFace(deviceVoices, language, kind, chosen?.[kind])
  const inUse = voiceOf(tutor)
  const groups = VOICE_GENDERS.filter((gender) => voices.some((voice) => voice.gender === gender))
  const group =
    pickedGroup !== null && groups.includes(pickedGroup)
      ? pickedGroup
      : (inUse?.gender ?? groups[0] ?? 'other')
  const listed = voices.filter((voice) => voice.gender === group)
  const picked = listed.find((voice) => voice.id === pickedId)
  const selected = picked ?? listed.find((voice) => voice.id === inUse?.id)

  const forget = () => {
    playback.stop()
    setPlayingId(null)
    setPickedId(null)
    setSavedId(null)
  }

  const play = (voice: VoiceChoice) => {
    if (playingId === voice.id && playback.status === 'playing') {
      playback.stop()
      setPlayingId(null)
      return
    }
    setPlayingId(voice.id)
    void playback.playAll([{ text: sample }], { lang: language, voiceURI: voice.id }).then(() => {
      setPlayingId((current) => (current === voice.id ? null : current))
    })
  }

  return {
    supported: isSpeechSupported(),
    languages,
    language,
    languageName: languages.find(({ code }) => code === language)?.nativeName ?? language,
    changeLanguage: (code: string) => {
      forget()
      setPickedGroup(null)
      setLanguage(code)
    },
    /** The tutor whose voice is being chosen, and the voice each of the two has now. */
    tutor,
    tutors: VOICE_KINDS.map((kind) => ({ kind, voice: voiceOf(kind) })),
    changeTutor: (kind: VoiceKind) => {
      forget()
      setPickedGroup(null)
      setPickedTutor(kind)
    },
    groups,
    group,
    changeGroup: (gender: VoiceGender) => {
      forget()
      setPickedGroup(gender)
    },
    /** The voices of the group on show. */
    voices: listed,
    /** Whether the device has any voice for the language, in whatever group. */
    hasVoices: voices.length > 0,
    selected,
    /** The voice this tutor speaks with when none is chosen for it. */
    defaultId: voiceForFace(deviceVoices, language, tutor)?.id ?? null,
    select: (id: string) => {
      haptic('tap')
      setPickedId(id)
      setSavedId(null)
    },
    sample,
    /** The voice being tried out right now, if any. */
    playingId: playback.status === 'playing' ? playingId : null,
    playFailed: playback.status === 'failed',
    play,
    /** A voice other than this tutor's is selected, so there is something to save. */
    canSave: picked !== undefined && picked.id !== inUse?.id,
    /** The voice saved a moment ago, until something else is touched. */
    justSaved: voices.find((voice) => voice.id === savedId),
    save: () => {
      if (!picked) return
      setVoice(language, tutor, picked.id)
      setSavedId(picked.id)
      haptic('success')
    },
  }
}
