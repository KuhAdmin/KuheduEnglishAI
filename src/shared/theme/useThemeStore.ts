import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getThemeScheme, isThemePreference, type ThemeId, type ThemePreference } from './themes'

/** Also read by the boot script in index.html. */
export const THEME_STORAGE_KEY = 'kuhedu-theme-v2'

type ThemeState = {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'auto',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: THEME_STORAGE_KEY,
      // createJSONStorage swallows unavailable storage (private mode, blocked site data).
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preference: state.preference }),
      // A theme saved by an older build may no longer exist.
      merge: (persisted, current) => {
        const saved = (persisted as Partial<ThemeState> | undefined)?.preference
        return { ...current, preference: isThemePreference(saved) ? saved : 'auto' }
      },
    },
  ),
)

/** Reflect the resolved theme on <html>, which the design tokens key off. */
export function applyTheme(id: ThemeId) {
  const root = document.documentElement
  root.dataset.theme = id
  root.dataset.scheme = getThemeScheme(id)

  // Keep the browser / status bar color in step with the theme background.
  const background = getComputedStyle(root).getPropertyValue('--color-bg').trim()
  if (background) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background)
  }
}
