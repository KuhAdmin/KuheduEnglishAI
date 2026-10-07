import { useMemo } from 'react'
import { useT } from '@/shared/lib/i18n'
import { AUTO_DARK_THEME, AUTO_LIGHT_THEME, themes, useThemeStore } from '@/shared/theme'
import { ThemePicker, type ThemePickerOption } from '@/shared/theme/ThemePicker'

/** Lets the learner choose a named color theme; saved on this device. */
export function ThemeSetting() {
  const t = useT()
  const preference = useThemeStore((state) => state.preference)
  const setPreference = useThemeStore((state) => state.setPreference)

  const options = useMemo<ThemePickerOption[]>(
    () => [
      {
        value: 'auto',
        label: t('theme.auto'),
        hint: t('theme.autoHint'),
        preview: [AUTO_LIGHT_THEME, AUTO_DARK_THEME],
      },
      ...themes.map((theme) => ({
        value: theme.id,
        label: t(theme.nameKey),
        preview: [theme.id],
      })),
    ],
    [t],
  )

  return (
    <ThemePicker
      legend={t('profile.themeLegend')}
      options={options}
      value={preference}
      onChange={setPreference}
    />
  )
}
