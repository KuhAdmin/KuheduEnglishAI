import { useCallback } from 'react'

const patterns = {
  tap: 10,
  recordStart: 20,
  recordStop: [15, 40, 15],
  success: [10, 30, 20],
  error: [40, 60, 40],
} satisfies Record<string, number | number[]>

export type HapticPattern = keyof typeof patterns

/**
 * Subtle vibration feedback for key moments. No-op where unsupported (e.g. iOS Safari).
 * TODO(settings): respect a user "haptics off" preference once settings exist.
 */
export function useHaptics() {
  return useCallback((pattern: HapticPattern) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(patterns[pattern])
    }
  }, [])
}
