import { redirect, type RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

// Access is guarded where these routes are mounted (app/router.tsx, `requireAdmin`).
export const adminRoutes: RouteObject[] = [
  {
    path: paths.admin,
    lazy: async () => ({ Component: (await import('./components/AdminLayout')).AdminLayout }),
    children: [
      { index: true, loader: () => redirect(paths.adminTexts) },
      {
        path: paths.adminTexts,
        lazy: async () => ({
          Component: (await import('./pages/ScreenTextsPage')).ScreenTextsPage,
        }),
      },
      {
        path: paths.adminCurriculum,
        lazy: async () => ({
          Component: (await import('./pages/CurriculumPage')).CurriculumPage,
        }),
      },
      {
        path: paths.adminLessons,
        lazy: async () => ({
          Component: (await import('./pages/LessonsPage')).LessonsPage,
        }),
      },
      {
        path: paths.adminLanding,
        lazy: async () => ({
          Component: (await import('./pages/LandingSettingsPage')).LandingSettingsPage,
        }),
      },
      {
        path: paths.adminLanguages,
        lazy: async () => ({
          Component: (await import('./pages/LanguagesSettingsPage')).LanguagesSettingsPage,
        }),
      },
      {
        path: paths.adminProfiles,
        lazy: async () => ({
          Component: (await import('./pages/ProfilesSettingsPage')).ProfilesSettingsPage,
        }),
      },
    ],
  },
]
