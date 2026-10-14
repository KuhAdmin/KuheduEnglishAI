import { ApiError } from '../api/client'

/**
 * Where an editor's save goes when a settings object is kept on the server, in place of this
 * browser's storage. The lessons' (`lessonsRemote`) and everything else an admin manages
 * (`appConfigRemote`) each give one.
 */
export type SettingsRemote = {
  /**
   * Bring the server from what was saved to what is to be saved. What it takes is in this
   * browser's copy at once; when it throws, what it did not take stays unsaved.
   */
  save: (previous: unknown, next: unknown) => Promise<void>
}

/** Whether a save failed because someone else saved the same thing first. */
export const isStaleSave = (error: unknown) =>
  error instanceof ApiError && error.code === 'conflict'

/** Content as one text, whatever order its keys are in. */
export const asText = (value: unknown): string =>
  JSON.stringify(value, (_key, held: unknown) =>
    typeof held === 'object' && held !== null && !Array.isArray(held)
      ? Object.fromEntries(Object.entries(held).sort(([a], [b]) => (a < b ? -1 : 1)))
      : held,
  )
