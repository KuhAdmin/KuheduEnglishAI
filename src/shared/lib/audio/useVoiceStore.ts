import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { baseLanguage, VOICE_KINDS, type VoiceKind } from './voices'

/** The voice chosen for each kind of tutor, as its `voiceURI`. */
export type ChosenVoices = Partial<Record<VoiceKind, string>>

type VoiceChoices = {
  /**
   * The voices the learner chose, by base language (`en`, `bn`): one for the male tutor and one
   * for the female. A kind without an entry is spoken with the device's first voice of that kind.
   */
  voices: Record<string, ChosenVoices>
}

type VoiceState = VoiceChoices & {
  setVoice: (language: string, kind: VoiceKind, voiceURI: string) => void
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** What was saved, kept only where it is a voice for a kind of tutor. */
function readChoices(saved: unknown): Record<string, ChosenVoices> {
  if (!isRecord(saved)) return {}
  const voices: Record<string, ChosenVoices> = {}
  for (const [language, kinds] of Object.entries(saved)) {
    // A build with one voice per language saved a string here; which tutor it was for is not known.
    if (!isRecord(kinds)) continue
    const chosen: ChosenVoices = {}
    for (const kind of VOICE_KINDS) {
      const voiceURI = kinds[kind]
      if (typeof voiceURI === 'string') chosen[kind] = voiceURI
    }
    if (Object.keys(chosen).length > 0) voices[language] = chosen
  }
  return voices
}

// Voices belong to the device, so these choices stay on it even once learners have accounts.
export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      voices: {},
      setVoice: (language, kind, voiceURI) =>
        set((state) => {
          const base = baseLanguage(language)
          return {
            voices: { ...state.voices, [base]: { ...state.voices[base], [kind]: voiceURI } },
          }
        }),
    }),
    {
      name: 'kuhedu-voice',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ voices }): VoiceChoices => ({ voices }),
      merge: (persisted, current) => ({
        ...current,
        voices: readChoices((persisted as { voices?: unknown } | undefined)?.voices),
      }),
    },
  ),
)

/** The voice chosen for a kind of tutor in a language, if any. For code outside React. */
export const chosenVoiceURI = (language: string, kind: VoiceKind): string | undefined =>
  useVoiceStore.getState().voices[baseLanguage(language)]?.[kind]
