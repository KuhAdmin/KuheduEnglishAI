import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const placementRoutes: RouteObject[] = [
  {
    path: paths.placementTest,
    lazy: async () => ({
      Component: (await import('./pages/PlacementTestPage')).PlacementTestPage,
    }),
  },
]
