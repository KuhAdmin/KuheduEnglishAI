import { useCallback, useSyncExternalStore } from 'react'
import { hasVoiceFor, onVoicesChanged } from './speech'

/**
 * Whether the device has a voice for a language other than English (pass `undefined` when there
 * is nothing to say). Voices load a moment after the page does, so the answer can turn true.
 */
export function useVoiceAvailable(language: string | undefined): boolean {
  const available = useCallback(() => language !== undefined && hasVoiceFor(language), [language])
  return useSyncExternalStore(onVoicesChanged, available, () => false)
}
