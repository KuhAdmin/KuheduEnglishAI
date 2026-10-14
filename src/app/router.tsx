import { createBrowserRouter } from 'react-router'
import { ensureAppConfig } from '@/shared/lib/appConfig/appConfigRemote'
import { adminRoutes } from '@/features/admin'
import { authRoutes, authStepRoutes, requireAccount, requireAdmin } from '@/features/auth'
import { conversationRoutes } from '@/features/conversation'
import { homeRoutes, weekRoutes } from '@/features/home'
import { landingRoutes } from '@/features/landing'
import { lessonDayRoutes, lessonsRoutes } from '@/features/lessons'
import { onboardingRoutes } from '@/features/onboarding'
import { placementRoutes } from '@/features/placement'
import { profileRoutes, profileSettingsRoutes } from '@/features/profile'
import { progressRoutes } from '@/features/progress'
import { PhoneLayout } from './layouts/PhoneLayout'
import { RootLayout } from './layouts/RootLayout'
import { ScreenLayout } from './layouts/ScreenLayout'
import { TabsLayout } from './layouts/TabsLayout'
import { RouteError } from './routes/RouteError'
import { openWhereTheyLeftOff } from './routes/whereTheyLeftOff'

/**
 * The app's routes. A router runs the first screen's loaders the moment it is made, so it is
 * made by the app shell, after what those loaders count on has been started, and not here as
 * this file is read.
 */
export const createAppRouter = () =>
  createBrowserRouter([
    {
      path: '/',
      Component: RootLayout,
      ErrorBoundary: RouteError,
      // Shown while the first lazy route loads; the HTML background already matches the theme.
      HydrateFallback: () => null,
      // What an admin wrote (the landing page, the languages, the screen texts…) is the server's:
      // waited for a moment as the app opens, so the first screen is not drawn with what is
      // built in and then redrawn. Once, not at every step taken inside.
      loader: async () => {
        await ensureAppConfig()
        return null
      },
      shouldRevalidate: () => false,
      children: [
        // Learner app: phone-width column
        {
          Component: PhoneLayout,
          children: [
            // What a visitor without an account can open: the landing page (for a first visit;
            // anyone signed in goes on from where they were) and the ways of getting an account.
            { loader: openWhereTheyLeftOff, children: landingRoutes },
            ...authStepRoutes,
            { Component: ScreenLayout, children: authRoutes },
            // Everything else is a learner's, and there are no guests: only with an account.
            {
              loader: requireAccount,
              // Asked on the way in, not again at every step taken inside (a part of a review
              // opened, a scenario picked): on a poor connection each would wait for the server.
              shouldRevalidate: () => false,
              children: [
                // Full-bleed screens
                ...onboardingRoutes,
                ...placementRoutes,
                ...weekRoutes,
                ...lessonDayRoutes,
                ...profileSettingsRoutes,
                // Padded screens outside the main tabs
                { Component: ScreenLayout, children: conversationRoutes },
                // The main tabs, with the bottom navigation
                {
                  Component: TabsLayout,
                  children: [...homeRoutes, ...lessonsRoutes, ...progressRoutes, ...profileRoutes],
                },
              ],
            },
          ],
        },
        // Admin area: wider layout, signed-in admins only
        { loader: requireAdmin, children: adminRoutes },
      ],
    },
  ])
