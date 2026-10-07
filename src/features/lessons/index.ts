import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const lessonsRoutes: RouteObject[] = [
  {
    path: paths.lessons,
    lazy: async () => ({ Component: (await import('./pages/LessonsPage')).LessonsPage }),
  },
]
