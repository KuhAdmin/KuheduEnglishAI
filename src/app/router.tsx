import { createBrowserRouter } from 'react-router'
import { adminRoutes } from '@/features/admin'
import { authRoutes, requireAdmin } from '@/features/auth'
import { conversationRoutes } from '@/features/conversation'
import { homeRoutes } from '@/features/home'
import { landingRoutes } from '@/features/landing'
import { lessonsRoutes } from '@/features/lessons'
import { onboardingRoutes } from '@/features/onboarding'
import { placementRoutes } from '@/features/placement'
import { profileRoutes } from '@/features/profile'
import { PhoneLayout } from './layouts/PhoneLayout'
import { RootLayout } from './layouts/RootLayout'
import { ScreenLayout } from './layouts/ScreenLayout'
import { RouteError } from './routes/RouteError'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    ErrorBoundary: RouteError,
    // Shown while the first lazy route loads; the HTML background already matches the theme.
    HydrateFallback: () => null,
    children: [
      // Learner app: phone-width column
      {
        Component: PhoneLayout,
        children: [
          // Full-bleed screens
          ...landingRoutes,
          ...onboardingRoutes,
          // Padded screens
          {
            Component: ScreenLayout,
            children: [
              ...authRoutes,
              ...placementRoutes,
              ...homeRoutes,
              ...conversationRoutes,
              ...lessonsRoutes,
              ...profileRoutes,
            ],
          },
        ],
      },
      // Admin area: wider layout, signed-in admins only
      { loader: requireAdmin, children: adminRoutes },
    ],
  },
])
