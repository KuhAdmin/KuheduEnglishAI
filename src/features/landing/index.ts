import type { RouteObject } from 'react-router'

export const landingRoutes: RouteObject[] = [
  {
    // For a first visit only: the app sends everyone else on (`openWhereTheyLeftOff`, in app/).
    index: true,
    lazy: async () => ({ Component: (await import('./pages/LandingPage')).LandingPage }),
  },
]
