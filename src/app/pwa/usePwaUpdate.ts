import { useRegisterSW } from 'virtual:pwa-register/react'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registers the service worker and exposes update state. The app decides when to apply an
 * update, so a learner is never reloaded mid-conversation.
 */
export function usePwaUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), UPDATE_CHECK_INTERVAL_MS)
    },
  })

  return {
    needRefresh,
    offlineReady,
    applyUpdate: () => updateServiceWorker(true),
    dismiss: () => {
      setNeedRefresh(false)
      setOfflineReady(false)
    },
  }
}
