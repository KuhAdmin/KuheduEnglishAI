import { useMemo, useSyncExternalStore } from 'react'
import type { z } from 'zod'
import { parseSettings, settingsRepository } from './settingsRepository'

type AppConfigOptions<T> = {
  /** Settings object name, e.g. `landing`. */
  name: string
  schema: z.ZodType<T>
  /** Built-in values, used until an admin saves something else. */
  defaults: T
}

/**
 * Admin-managed settings, available synchronously and kept live: when an admin saves (in this
 * tab or another one), every screen using the settings re-renders with the new values.
 * Anything missing or invalid falls back to the built-in defaults.
 */
export function useAppConfig<T>({ name, schema, defaults }: AppConfigOptions<T>): T {
  const raw = useSyncExternalStore(
    settingsRepository.subscribe,
    () => settingsRepository.readRaw(name),
    () => null,
  )

  return useMemo(() => parseSettings(raw, schema) ?? defaults, [raw, schema, defaults])
}
