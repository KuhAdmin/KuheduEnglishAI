/**
 * This browser's copy of the admin-managed settings, which screens read synchronously.
 *
 * The settings are the server's: `appConfigRemote` and `weekContentRemote` fill this copy from
 * it and write an editor's save into it once the server has taken it, and every tab of the
 * browser follows. Without them running (a unit test), the copy is all there is, as it was
 * before the server kept settings.
 */

const KEY_PREFIX = 'kuhedu-settings:'
const CHANGE_EVENT = 'kuhedu-settings-change'

/** Thrown when the browser refuses to store more (usually: too many or too large images). */
export class SettingsStorageError extends Error {
  constructor() {
    super('Browser storage is full')
    this.name = 'SettingsStorageError'
  }
}

const key = (name: string) => `${KEY_PREFIX}${name}`

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export const settingsRepository = {
  /** Stored JSON text for a settings object, or `null` when nothing is saved (defaults apply). */
  readRaw(name: string): string | null {
    try {
      return localStorage.getItem(key(name))
    } catch {
      return null
    }
  },

  write(name: string, value: unknown): void {
    try {
      localStorage.setItem(key(name), JSON.stringify(value))
    } catch {
      throw new SettingsStorageError()
    }
    notify()
  },

  /** Forget the saved value, so the built-in defaults apply again. */
  remove(name: string): void {
    try {
      localStorage.removeItem(key(name))
    } catch {
      // Nothing was stored if storage is unavailable.
    }
    notify()
  },

  /** Called when any settings object changes — in this tab or in another tab of the browser. */
  subscribe(listener: () => void): () => void {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(KEY_PREFIX)) listener()
    }
    window.addEventListener(CHANGE_EVENT, listener)
    window.addEventListener('storage', handleStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, listener)
      window.removeEventListener('storage', handleStorage)
    }
  },
}

/** Parse stored JSON text with a settings schema; `undefined` when missing or unusable. */
export function parseSettings<T>(
  raw: string | null,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
): T | undefined {
  if (raw === null) return undefined
  try {
    const result = schema.safeParse(JSON.parse(raw))
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}
