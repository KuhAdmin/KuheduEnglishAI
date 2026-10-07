import type { RouteObject } from 'react-router'

export const landingRoutes: RouteObject[] = [
  {
    // TODO(auth): redirect signed-in users to paths.home.
    index: true,
    lazy: async () => ({ Component: (await import('./pages/LandingPage')).LandingPage }),
  },
]
