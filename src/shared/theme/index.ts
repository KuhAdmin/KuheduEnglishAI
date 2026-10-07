// ThemePicker is deliberately not re-exported: the app shell imports this barrel, and the picker
// should only load with the screen that shows it. Import it from '@/shared/theme/ThemePicker'.
export {
  AUTO_DARK_THEME,
  AUTO_LIGHT_THEME,
  isThemePreference,
  resolveTheme,
  themes,
  type ThemeId,
  type ThemePreference,
  type ThemeScheme,
} from './themes'
export { useApplyTheme } from './useApplyTheme'
export { applyTheme, THEME_STORAGE_KEY, useThemeStore } from './useThemeStore'
