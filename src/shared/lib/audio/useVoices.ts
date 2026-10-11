import { useEffect, useSyncExternalStore } from 'react'
import { loadSpeechVoices, onSpeechVoicesChanged, speechVoices } from './speechCatalogue'
import type { VoiceChoice } from './voices'

const NONE: readonly VoiceChoice[] = []

/**
 * The voices the server offers. They arrive a moment after the screen does on a first visit,
 * so the list can fill in while a screen is open; afterwards the last list is there at once.
 */
export function useVoices(): readonly VoiceChoice[] {
  useEffect(() => {
    void loadSpeechVoices()
  }, [])
  return useSyncExternalStore(onSpeechVoicesChanged, speechVoices, () => NONE)
}
