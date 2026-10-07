import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const homeRoutes: RouteObject[] = [
  {
    path: paths.home,
    lazy: async () => ({ Component: (await import('./pages/HomePage')).HomePage }),
  },
]
