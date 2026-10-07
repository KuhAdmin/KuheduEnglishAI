import { useState } from 'react'
import type { z } from 'zod'
import { settingsRepository, SettingsStorageError } from '@/shared/lib/appConfig/settingsRepository'
import { useAppConfig } from '@/shared/lib/appConfig/useAppConfig'

export type DraftStatus = 'idle' | 'saved' | 'reset' | 'storage-full'

type SettingsDraftOptions<T> = {
  name: string
  schema: z.ZodType<T>
  defaults: T
}

/**
 * Editing state for one settings object: the admin changes a draft, then saves it (every open
 * tab of the app updates), discards it, or resets the section to the built-in defaults.
 */
export function useSettingsDraft<T>({ name, schema, defaults }: SettingsDraftOptions<T>) {
  const saved = useAppConfig({ name, schema, defaults })
  // `null` while nothing has been edited: the form then mirrors what is saved.
  const [draft, setDraft] = useState<T | null>(null)
  const [status, setStatus] = useState<DraftStatus>('idle')

  const value = draft ?? saved
  const isDirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(saved)

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
      // Run the draft through the schema so what is stored is exactly what screens will read.
      const result = schema.safeParse(finalise ? finalise(value) : value)
      if (!result.success) return
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
      settingsRepository.remove(name)
      setDraft(null)
      setStatus('reset')
    },
  }
}

export type SettingsDraft<T> = ReturnType<typeof useSettingsDraft<T>>
