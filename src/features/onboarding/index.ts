import { redirect, type RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

// Steps in order: language → profile → placement-test intro.
export const onboardingRoutes: RouteObject[] = [
  {
    path: paths.onboarding,
    children: [
      // The flow starts at its first step.
      { index: true, loader: () => redirect(paths.onboardingLanguage) },
      {
        path: paths.onboardingLanguage,
        lazy: async () => ({
          Component: (await import('./pages/LanguageStepPage')).LanguageStepPage,
        }),
      },
      {
        path: paths.onboardingProfile,
        lazy: async () => ({
          Component: (await import('./pages/ProfileStepPage')).ProfileStepPage,
        }),
      },
      {
        path: paths.onboardingPlacement,
        lazy: async () => ({
          Component: (await import('./pages/PlacementIntroPage')).PlacementIntroPage,
        }),
      },
    ],
  },
]
