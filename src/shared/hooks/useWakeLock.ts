import { useEffect } from 'react'

/**
 * Keeps the screen from dimming and locking while `active` (a conversation in progress, where
 * the learner listens and speaks without touching the screen). Does nothing where the Screen
 * Wake Lock API is missing or refused, e.g. in battery-saver mode. The browser drops the lock
 * whenever the page is hidden, so it is asked for again when the page comes back.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let lock: WakeLockSentinel | null = null
    let ended = false

    const request = async () => {
      try {
        const granted = await navigator.wakeLock.request('screen')
        if (ended) void granted.release()
        else lock = granted
      } catch {
        // Refused: the screen dims as usual, which costs the learner a tap, nothing more.
      }
    }
    const handleVisibility = () => {
      if (!document.hidden) void request()
    }

    void request()
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      ended = true
      document.removeEventListener('visibilitychange', handleVisibility)
      void lock?.release()
    }
  }, [active])
}
