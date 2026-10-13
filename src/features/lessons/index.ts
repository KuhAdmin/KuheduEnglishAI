import type { RouteObject } from 'react-router'
import { isDayNumber, isWeekNumber } from '@/shared/lib/curriculum/curriculum'
import { ensureWeekContent } from '@/shared/lib/curriculum/weekContentRemote'
import { paths } from '@/shared/lib/paths'

export const lessonsRoutes: RouteObject[] = [
  {
    path: paths.lessons,
    lazy: async () => ({ Component: (await import('./pages/LessonsPage')).LessonsPage }),
  },
]

/** Full-screen, without the bottom navigation: a day of lessons is worked through step by step. */
export const lessonDayRoutes: RouteObject[] = [
  {
    path: paths.lessonDay,
    loader: async ({ params }) => {
      if (!isWeekNumber(Number(params.week)) || !isDayNumber(Number(params.day))) {
        throw new Response(null, { status: 404 })
      }
      // The day's content as the server has it; the screen never waits long for it.
      await ensureWeekContent(Number(params.week))
      return null
    },
    lazy: async () => ({ Component: (await import('./pages/LessonDayPage')).LessonDayPage }),
  },
]
