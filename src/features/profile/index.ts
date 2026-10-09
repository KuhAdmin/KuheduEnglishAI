import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const profileRoutes: RouteObject[] = [
  {
    path: paths.profile,
    lazy: async () => ({ Component: (await import('./pages/ProfilePage')).ProfilePage }),
  },
]

/** Full-screen, without the bottom navigation: each setting has its own way back to Profile. */
export const profileSettingsRoutes: RouteObject[] = [
  {
    path: paths.profileLanguage,
    lazy: async () => ({
      Component: (await import('./pages/ProfileLanguagePage')).ProfileLanguagePage,
    }),
  },
  {
    path: paths.profileAppearance,
    lazy: async () => ({
      Component: (await import('./pages/ProfileAppearancePage')).ProfileAppearancePage,
    }),
  },
  {
    path: paths.profileVoice,
    lazy: async () => ({
      Component: (await import('./pages/VoiceSettingsPage')).VoiceSettingsPage,
    }),
  },
  {
    path: paths.profileTutor,
    lazy: async () => ({
      Component: (await import('./pages/TutorAvatarPage')).TutorAvatarPage,
    }),
  },
]
