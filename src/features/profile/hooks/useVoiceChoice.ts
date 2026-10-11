import { useEffect, useMemo, useState } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { loadSpeechVoices, speechVoicesKnown } from '@/shared/lib/audio/speechCatalogue'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoices } from '@/shared/lib/audio/useVoices'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import {
  baseLanguage,
  voiceForFace,
  voicesFor,
  VOICE_KINDS,
  type VoiceChoice,
  type VoiceKind,
} from '@/shared/lib/audio/voices'
import { DEFAULT_LANGUAGE, isEnglish, useTFor } from '@/shared/lib/i18n'
import { useTutorVoiceKind } from '@/shared/lib/learner/tutorAvatar'

/**
 * Choosing the two voices the app speaks a language with, one for each kind of tutor: which
 * language, tutor and kind of voice are on show, the voice picked (not saved until `save`),
 * trying one out, and saving it for the tutor on show. The voices are the server's.
 */
export function useVoiceChoice() {
  const haptic = useHaptics()
  const { languages: learnerLanguages } = useLanguagesConfig()
  const allVoices = useVoices()
  const allChosen = useVoiceStore((state) => state.voices)
  const setVoice = useVoiceStore((state) => state.setVoice)
  const playback = useSpeechPlayback()
  const ownTutor = useTutorVoiceKind()

  // On a first visit the voices are still on their way: nothing is called missing meanwhile.
  const [waiting, setWaiting] = useState(() => !speechVoicesKnown())
  useEffect(() => {
    let gone = false
    void loadSpeechVoices().then(() => {
      if (!gone) setWaiting(false)
    })
    return () => {
      gone = true
    }
  }, [])

  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  // The screen opens on the learner's own tutor.
  const [pickedTutor, setPickedTutor] = useState<VoiceKind | null>(null)
  const tutor = pickedTutor ?? ownTutor
  const [pickedGroup, setPickedGroup] = useState<VoiceKind | null>(null)
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

  const voices = useMemo(() => voicesFor(allVoices, language), [allVoices, language])
  const chosen = allChosen[baseLanguage(language)]
  /** The voice each kind of tutor speaks with now: the one chosen for it, or its default. */
  const voiceOf = (kind: VoiceKind) => voiceForFace(allVoices, language, kind, chosen?.[kind])
  const inUse = voiceOf(tutor)
  const groups = VOICE_KINDS.filter((kind) => voices.some((voice) => voice.gender === kind))
  const group =
    pickedGroup !== null && groups.includes(pickedGroup)
      ? pickedGroup
      : (inUse?.gender ?? groups[0] ?? 'female')
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
    void playback.playAll([{ text: sample }], { lang: language, voiceId: voice.id }).then(() => {
      setPlayingId((current) => (current === voice.id ? null : current))
    })
  }

  return {
    /** The server's voices are not known yet, and nothing has been said about them. */
    waiting: waiting && allVoices.length === 0,
    /** The server offers voices at all; without them there is nothing to choose from. */
    available: allVoices.length > 0,
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
    changeGroup: (kind: VoiceKind) => {
      forget()
      setPickedGroup(kind)
    },
    /** The voices of the kind on show. */
    voices: listed,
    /** Whether there is any voice for the language, of either kind. */
    hasVoices: voices.length > 0,
    selected,
    /** The voice this tutor speaks with when none is chosen for it. */
    defaultId: voiceForFace(allVoices, language, tutor)?.id ?? null,
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
