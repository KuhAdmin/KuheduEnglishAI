import { useSyncExternalStore } from 'react'
import { isSpeechSupported, onVoicesChanged } from './speech'

const NONE: readonly SpeechSynthesisVoice[] = []

// The browser hands out a new list every time it is asked, so the last one is kept for as long
// as it names the same voices: a snapshot has to stay the same object between changes.
let cached: { key: string; voices: readonly SpeechSynthesisVoice[] } = { key: '', voices: NONE }

function currentVoices(): readonly SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return NONE
  const voices = window.speechSynthesis.getVoices()
  const key = voices.map((voice) => `${voice.voiceURI}|${voice.lang}`).join('\n')
  if (key !== cached.key) cached = { key, voices }
  return cached.voices
}

/**
 * The device's voices. They load a moment after the page does (and some arrive from the
 * network later still), so the list can grow while a screen is open.
 */
export function useVoices(): readonly SpeechSynthesisVoice[] {
  return useSyncExternalStore(onVoicesChanged, currentVoices, () => NONE)
}
