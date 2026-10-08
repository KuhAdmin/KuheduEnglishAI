import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const progressRoutes: RouteObject[] = [
  {
    path: paths.progress,
    lazy: async () => ({ Component: (await import('./pages/ProgressPage')).ProgressPage }),
  },
]
