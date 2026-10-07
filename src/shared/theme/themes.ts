import type { TranslationKey } from '@/shared/lib/i18n'

export type ThemeScheme = 'light' | 'dark'

type ThemeDefinition = {
  id: string
  nameKey: TranslationKey
  scheme: ThemeScheme
}

/**
 * Named themes. Each is one complete look whose colors live in the matching
 * `[data-theme='<id>']` block in shared/styles/tokens.css.
 * Keep the boot script in index.html in sync when adding one (tested).
 */
export const themes = [
  { id: 'indigo-dawn', nameKey: 'theme.indigoDawn', scheme: 'light' },
  { id: 'morning-bliss', nameKey: 'theme.morningBliss', scheme: 'light' },
  { id: 'sage-dusk', nameKey: 'theme.sageDusk', scheme: 'dark' },
  { id: 'midnight-iris', nameKey: 'theme.midnightIris', scheme: 'dark' },
] as const satisfies readonly ThemeDefinition[]

export type ThemeId = (typeof themes)[number]['id']

/** 'auto' follows the device's light/dark setting. */
export type ThemePreference = 'auto' | ThemeId

export const AUTO_LIGHT_THEME: ThemeId = 'indigo-dawn'
export const AUTO_DARK_THEME: ThemeId = 'midnight-iris'

export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'auto' || isThemeId(value)
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ThemeId {
  if (preference !== 'auto') return preference
  return systemPrefersDark ? AUTO_DARK_THEME : AUTO_LIGHT_THEME
}

export function getThemeScheme(id: ThemeId): ThemeScheme {
  return themes.find((theme) => theme.id === id)?.scheme ?? 'light'
}
