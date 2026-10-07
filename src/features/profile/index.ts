import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const profileRoutes: RouteObject[] = [
  {
    path: paths.profile,
    lazy: async () => ({ Component: (await import('./pages/ProfilePage')).ProfilePage }),
  },
]
