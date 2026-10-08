import { createBrowserRouter } from 'react-router'
import { adminRoutes } from '@/features/admin'
import { authRoutes, requireAdmin } from '@/features/auth'
import { conversationRoutes } from '@/features/conversation'
import { homeRoutes, weekRoutes } from '@/features/home'
import { landingRoutes } from '@/features/landing'
import { lessonDayRoutes, lessonsRoutes } from '@/features/lessons'
import { onboardingRoutes } from '@/features/onboarding'
import { placementRoutes } from '@/features/placement'
import { profileRoutes } from '@/features/profile'
import { progressRoutes } from '@/features/progress'
import { PhoneLayout } from './layouts/PhoneLayout'
import { RootLayout } from './layouts/RootLayout'
import { ScreenLayout } from './layouts/ScreenLayout'
import { TabsLayout } from './layouts/TabsLayout'
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
          ...placementRoutes,
          ...weekRoutes,
          ...lessonDayRoutes,
          // Padded screens outside the main tabs
          {
            Component: ScreenLayout,
            children: [...authRoutes, ...conversationRoutes],
          },
          // The main tabs, with the bottom navigation
          {
            Component: TabsLayout,
            children: [...homeRoutes, ...lessonsRoutes, ...progressRoutes, ...profileRoutes],
          },
        ],
      },
      // Admin area: wider layout, signed-in admins only
      { loader: requireAdmin, children: adminRoutes },
    ],
  },
])
