import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export { requireAdmin } from './lib/requireAdmin'
export { useSessionStore } from './store/useSessionStore'

export const authRoutes: RouteObject[] = [
  {
    // One screen under both paths: it stays mounted while the visitor switches between them.
    lazy: async () => ({ Component: (await import('./pages/AuthPage')).AuthPage }),
    children: [
      // `element: null` because the parent draws the whole screen; the paths only pick its half.
      { path: paths.signIn, element: null },
      { path: paths.signUp, element: null },
    ],
  },
]
