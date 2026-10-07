/** Route paths in one place so links never hard-code strings. */
export const paths = {
  landing: '/',
  /** Same screen as `signUp`, opened on its "Sign in" half. */
  signIn: '/sign-in',
  signUp: '/sign-up',
  /** Redirects to the first onboarding step. */
  onboarding: '/onboarding',
  onboardingLanguage: '/onboarding/language',
  onboardingProfile: '/onboarding/profile',
  onboardingPlacement: '/onboarding/placement',
  placementTest: '/placement-test',
  placementResult: '/placement-test/result',
  home: '/home',
  practice: '/practice',
  lessons: '/lessons',
  profile: '/profile',
  /** Redirects to the first admin section. */
  admin: '/admin',
  adminTexts: '/admin/texts',
  adminLanding: '/admin/landing',
  adminLanguages: '/admin/languages',
  adminProfiles: '/admin/profiles',
} as const
