import type { RouteObject } from 'react-router'
import { isDayNumber, isWeekNumber } from '@/shared/lib/curriculum/curriculum'
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
    loader: ({ params }) => {
      if (!isWeekNumber(Number(params.week)) || !isDayNumber(Number(params.day))) {
        throw new Response(null, { status: 404 })
      }
      return null
    },
    lazy: async () => ({ Component: (await import('./pages/LessonDayPage')).LessonDayPage }),
  },
]
