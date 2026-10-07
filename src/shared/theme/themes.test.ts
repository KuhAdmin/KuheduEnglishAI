import { beforeEach, describe, expect, it } from 'vitest'
import indexHtml from '../../../index.html?raw'
import {
  AUTO_DARK_THEME,
  AUTO_LIGHT_THEME,
  isThemePreference,
  resolveTheme,
  themes,
} from './themes'
import { applyTheme, THEME_STORAGE_KEY, useThemeStore } from './useThemeStore'

describe('resolveTheme', () => {
  it('follows the system for "auto"', () => {
    expect(resolveTheme('auto', false)).toBe(AUTO_LIGHT_THEME)
    expect(resolveTheme('auto', true)).toBe(AUTO_DARK_THEME)
  })

  it('lets an explicit theme win over the system setting', () => {
    expect(resolveTheme('sage-dusk', false)).toBe('sage-dusk')
    expect(resolveTheme('morning-bliss', true)).toBe('morning-bliss')
  })

  it('pairs "auto" with one light and one dark theme', () => {
    const scheme = (id: string) => themes.find((theme) => theme.id === id)?.scheme
    expect(scheme(AUTO_LIGHT_THEME)).toBe('light')
    expect(scheme(AUTO_DARK_THEME)).toBe('dark')
  })
})

describe('isThemePreference', () => {
  it('accepts "auto" and known ids only', () => {
    expect(isThemePreference('auto')).toBe(true)
    expect(isThemePreference('sage-dusk')).toBe(true)
    expect(isThemePreference('dark')).toBe(false)
    expect(isThemePreference(undefined)).toBe(false)
  })
})

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    useThemeStore.setState({ preference: 'auto' })
  })

  it('persists the chosen theme', () => {
    useThemeStore.getState().setPreference('sage-dusk')
    const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}')
    expect(saved.state.preference).toBe('sage-dusk')
  })

  it('falls back to "auto" when the saved theme no longer exists', async () => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ state: { preference: 'retired-theme' }, version: 0 }),
    )
    await useThemeStore.persist.rehydrate()
    expect(useThemeStore.getState().preference).toBe('auto')
  })
})

describe('applyTheme', () => {
  it('sets data-theme and data-scheme on <html>', () => {
    applyTheme('sage-dusk')
    expect(document.documentElement.dataset.theme).toBe('sage-dusk')
    expect(document.documentElement.dataset.scheme).toBe('dark')
  })
})

describe('index.html boot script', () => {
  it('knows every theme, its scheme and the storage key', () => {
    for (const theme of themes) {
      expect(indexHtml).toContain(`'${theme.id}': '${theme.scheme}'`)
    }
    expect(indexHtml).toContain(`'${THEME_STORAGE_KEY}'`)
  })
})
