import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

import { requireUnverified } from './lib/requireUnverified'

export { requireAdmin } from './lib/requireAdmin'

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

/** Full-screen steps beside the account screen: the emailed code, and a forgotten password. */
export const authStepRoutes: RouteObject[] = [
  {
    path: paths.verifyEmail,
    loader: requireUnverified,
    lazy: async () => ({ Component: (await import('./pages/VerifyEmailPage')).VerifyEmailPage }),
  },
  {
    path: paths.forgotPassword,
    lazy: async () => ({
      Component: (await import('./pages/ForgotPasswordPage')).ForgotPasswordPage,
    }),
  },
]
