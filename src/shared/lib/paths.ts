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
  /** The 50-week journey. */
  home: '/home',
  /** One section of the journey; `:section` is 1 to 10. */
  homeSection: '/home/sections/:section',
  /** One week of the journey, in overview; `:week` is 1 to 50. */
  homeWeek: '/home/weeks/:week',
  practice: '/practice',
  lessons: '/lessons',
  /** One day of a week's lessons; `:day` is 1 to 7. */
  lessonDay: '/lessons/weeks/:week/days/:day',
  progress: '/progress',
  profile: '/profile',
  /** Redirects to the first admin section. */
  admin: '/admin',
  adminTexts: '/admin/texts',
  adminCurriculum: '/admin/curriculum',
  adminLessons: '/admin/lessons',
  adminLanding: '/admin/landing',
  adminLanguages: '/admin/languages',
  adminProfiles: '/admin/profiles',
} as const
