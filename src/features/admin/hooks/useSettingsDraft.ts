import { useState } from 'react'
import type { z } from 'zod'
import { settingsRepository, SettingsStorageError } from '@/shared/lib/appConfig/settingsRepository'
import { useAppConfig } from '@/shared/lib/appConfig/useAppConfig'
import { isStaleSave, lessonsRemote } from '@/shared/lib/curriculum/weekContentRemote'

/**
 * What happened to the last save. `saving`: it is on its way to the server. `failed`: the server
 * could not be reached, or would not take it. `conflict`: someone else saved the same thing
 * since it was opened here. In both of those the draft is still here, unsaved.
 */
export type DraftStatus =
  'idle' | 'saving' | 'saved' | 'reset' | 'storage-full' | 'failed' | 'conflict'

type SettingsDraftOptions<T> = {
  name: string
  schema: z.ZodType<T>
  defaults: T
}

/**
 * Editing state for one settings object: the admin changes a draft, then saves it (every open
 * tab of the app updates), discards it, or resets the section to the built-in defaults.
 *
 * **Where a save goes depends on the settings object.** The lessons' are kept on the server
 * (`lessonsRemote`), so their save is sent there and reaches every device; every other one is
 * still this browser's alone (`TODO(backend)`).
 */
export function useSettingsDraft<T>({ name, schema, defaults }: SettingsDraftOptions<T>) {
  const saved = useAppConfig({ name, schema, defaults })
  // `null` while nothing has been edited: the form then mirrors what is saved.
  const [draft, setDraft] = useState<T | null>(null)
  const [status, setStatus] = useState<DraftStatus>('idle')

  const value = draft ?? saved
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)

  /** Send a value to the server, which is where this settings object is kept. */
  const send = (
    next: T,
    done: DraftStatus,
    remote: NonNullable<ReturnType<typeof lessonsRemote>>,
  ) => {
    setStatus('saving')
    remote.save(saved, next).then(
      () => {
        setDraft(null)
        setStatus(done)
      },
      // The pieces the server took are saved; the draft keeps the rest for another try.
      (error: unknown) => setStatus(isStaleSave(error) ? 'conflict' : 'failed'),
    )
  }

  return {
    value,
    isDirty,
    status,
    /** True when the section differs from the built-in defaults (so "Reset" has an effect). */
    isCustomised: JSON.stringify(saved) !== JSON.stringify(defaults),

    update(change: (current: T) => T) {
      setDraft(change(value))
      setStatus('idle')
    },

    /** `finalise` can adjust the value just before it is stored (e.g. repair a dangling reference). */
    save(finalise?: (current: T) => T) {
      if (status === 'saving') return
      // Run the draft through the schema so what is stored is exactly what screens will read.
      const result = schema.safeParse(finalise ? finalise(value) : value)
      if (!result.success) return
      const remote = lessonsRemote(name)
      if (remote) return send(result.data, 'saved', remote)
      try {
        settingsRepository.write(name, result.data)
        setDraft(null)
        setStatus('saved')
      } catch (error) {
        if (!(error instanceof SettingsStorageError)) throw error
        setStatus('storage-full')
      }
    },

    discard() {
      setDraft(null)
      setStatus('idle')
    },

    resetToDefaults() {
      if (status === 'saving') return
      const remote = lessonsRemote(name)
      if (remote) return send(defaults, 'reset', remote)
      settingsRepository.remove(name)
      setDraft(null)
      setStatus('reset')
    },
  }
}

export type SettingsDraft<T> = ReturnType<typeof useSettingsDraft<T>>
