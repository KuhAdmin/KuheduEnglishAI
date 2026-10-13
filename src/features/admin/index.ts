import { redirect, type RouteObject } from 'react-router'
import { ensureAllLessonContent } from '@/shared/lib/curriculum/weekContentRemote'
import { paths } from '@/shared/lib/paths'

/**
 * Before an editor of lesson content opens: everything the server keeps of it is in this
 * browser, with the version of each piece, so that what is edited is what is there and a save
 * can say what it was written from. It does not fail, and with the server unreachable the
 * editor opens on this browser's copy.
 */
const withLessonContent = async () => {
  await ensureAllLessonContent()
  return null
}

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
        // The weeks' pictures are lesson content too.
        loader: withLessonContent,
        lazy: async () => ({
          Component: (await import('./pages/CurriculumPage')).CurriculumPage,
        }),
      },
      {
        path: paths.adminLessons,
        loader: withLessonContent,
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
