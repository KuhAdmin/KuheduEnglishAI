import { redirect, type RouteObject } from 'react-router'
import { ensureAllAppConfig } from '@/shared/lib/appConfig/appConfigRemote'
import { ensureAllLessonContent } from '@/shared/lib/curriculum/weekContentRemote'
import { paths } from '@/shared/lib/paths'

/**
 * Before an editor opens: everything the server keeps of what it edits is in this browser, with
 * versions, so that what is edited is what is there and a save can say what it was written
 * from. Neither fails, and with the server unreachable the editor opens on this browser's copy.
 */
const withSettings = async () => {
  await ensureAllAppConfig()
  return null
}

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
        loader: withSettings,
        lazy: async () => ({
          Component: (await import('./pages/ScreenTextsPage')).ScreenTextsPage,
        }),
      },
      {
        path: paths.adminCurriculum,
        // The course's wording, and the weeks' pictures, which are lesson content.
        loader: async () => {
          await Promise.all([ensureAllAppConfig(), ensureAllLessonContent()])
          return null
        },
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
        loader: withSettings,
        lazy: async () => ({
          Component: (await import('./pages/LandingSettingsPage')).LandingSettingsPage,
        }),
      },
      {
        path: paths.adminLanguages,
        loader: withSettings,
        lazy: async () => ({
          Component: (await import('./pages/LanguagesSettingsPage')).LanguagesSettingsPage,
        }),
      },
      {
        path: paths.adminProfiles,
        loader: withSettings,
        lazy: async () => ({
          Component: (await import('./pages/ProfilesSettingsPage')).ProfilesSettingsPage,
        }),
      },
    ],
  },
]
