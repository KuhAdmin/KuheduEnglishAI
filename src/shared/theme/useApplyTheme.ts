import { useEffect } from 'react'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { resolveTheme } from './themes'
import { applyTheme, useThemeStore } from './useThemeStore'

export function useApplyTheme() {
  const preference = useThemeStore((state) => state.preference)
  const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const themeId = resolveTheme(preference, systemPrefersDark)

  useEffect(() => applyTheme(themeId), [themeId])
}
