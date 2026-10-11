import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { baseLanguage, VOICE_KINDS, type VoiceKind } from './voices'

/** The voice chosen for each kind of tutor, as its id (`af_heart`). */
export type ChosenVoices = Partial<Record<VoiceKind, string>>

type VoiceChoices = {
  /**
   * The voices the learner chose, by base language (`en`, `hi`): one for the male tutor and one
   * for the female. A kind without an entry is spoken with that kind's default voice.
   */
  voices: Record<string, ChosenVoices>
}

type VoiceState = VoiceChoices & {
  setVoice: (language: string, kind: VoiceKind, voiceId: string) => void
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
      const voiceId = kinds[kind]
      if (typeof voiceId === 'string') chosen[kind] = voiceId
    }
    if (Object.keys(chosen).length > 0) voices[language] = chosen
  }
  return voices
}

// A choice made while the app spoke with the device's own voices names a voice the server does
// not have; it is passed over when a voice is picked (`voiceForFace`), not cleaned up here.
// TODO(backend): keep these with the learner's account, now that the voices are the same everywhere.
export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      voices: {},
      setVoice: (language, kind, voiceId) =>
        set((state) => {
          const base = baseLanguage(language)
          return {
            voices: { ...state.voices, [base]: { ...state.voices[base], [kind]: voiceId } },
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

/** The voices chosen for a language, by kind of tutor. For code outside React. */
export const chosenVoices = (language: string): ChosenVoices =>
  useVoiceStore.getState().voices[baseLanguage(language)] ?? {}
