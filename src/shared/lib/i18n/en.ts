/**
 * English screen texts — the source of truth for which texts exist.
 * Adding a key here requires the same key in every other built-in catalog (bn.ts, hi.ts);
 * TypeScript enforces it. Admins can override any text per language in Admin › Screen texts.
 */
export const en = {
  'app.name': 'Kuhedu English AI',
  'nav.home': 'Home',
  'nav.practice': 'Practice',
  'nav.lessons': 'Lessons',
  'nav.profile': 'Profile',

  // The landing page's wording itself is admin content (Admin › Landing page), not screen text.
  'landing.headlineLanguage': 'Headline language',

  // Sign in / sign up. `{brand}` in the title is replaced by the brand name from Admin › Landing page.
  'auth.back': 'Back',
  'auth.language': 'Language',
  'auth.title': 'Welcome to {brand}',
  'auth.signInSubtitle': 'Sign in to continue your learning journey.',
  'auth.signUpSubtitle': 'Create an account to start your learning journey.',
  'auth.modeLegend': 'Sign in or sign up',
  'auth.signInTab': 'Sign In',
  'auth.signUpTab': 'Sign Up',
  'auth.email': 'Email address',
  'auth.password': 'Password',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.forgotPassword': 'Forgot password?',
  'auth.signInSubmit': 'Sign In',
  'auth.signUpSubmit': 'Create Account',
  'auth.or': 'OR',
  'auth.google': 'Continue with Google',
  'auth.guest': 'Continue as Guest',
  'auth.haveAccount': 'Already have an account?',
  'auth.noAccount': 'Don’t have an account?',
  'auth.invalid': 'Incorrect email or password.',
  'auth.emailRequired': 'Enter your email address.',
  'auth.emailInvalid': 'Enter a valid email address.',
  'auth.passwordRequired': 'Enter your password.',
  'auth.passwordTooShort': 'Use at least 8 characters.',
  'auth.unavailable': 'Accounts are coming soon. For now, continue as a guest.',

  'onboarding.continue': 'Continue',
  'onboarding.language.title': 'Choose your language',
  'onboarding.language.subtitle': 'Get explanations and support in your preferred language.',
  'onboarding.profile.title': 'Tell us about yourself',
  'onboarding.profile.subtitle': 'We’ll personalise examples and situations.',
  'ageGroup.child': 'Child',
  'ageGroup.childRange': '(6–12)',
  'ageGroup.teen': 'Teenager',
  'ageGroup.teenRange': '(13–18)',
  'ageGroup.adult': 'Adult',
  'ageGroup.adultRange': '(18+)',
  'onboarding.placement.title': 'Let’s find your starting point',
  'onboarding.placement.subtitle': 'A short adaptive test to personalise your learning.',
  'onboarding.placement.skillsLabel': 'What the test covers',
  'onboarding.placement.listen': 'Listen',
  'onboarding.placement.understand': 'Understand',
  'onboarding.placement.speak': 'Speak',
  'onboarding.placement.translate': 'Translate (if needed)',
  'onboarding.placement.duration': '10–15 minutes',
  'onboarding.placement.start': 'Start Placement Test',

  'placementTest.title': 'Placement test',
  'placementTest.subtitle': 'The placement test is coming soon.',

  'home.title': 'Ready to speak?',
  'home.subtitle': 'Your daily conversation practice will appear here.',
  'practice.title': 'Talk with your tutor',
  'practice.subtitle': 'AI conversation practice is coming soon.',
  'lessons.title': 'Lessons',
  'lessons.subtitle': 'Structured lessons for every level are coming soon.',

  'profile.title': 'Your profile',
  'profile.subtitle': 'Progress, streaks and settings will live here.',
  'profile.appearance': 'Appearance',
  'profile.themeLegend': 'Color theme',
  'theme.auto': 'Auto',
  'theme.autoHint': 'Matches your phone',
  'theme.indigoDawn': 'Indigo Dawn',
  'theme.morningBliss': 'Morning Bliss',
  'theme.sageDusk': 'Sage Dusk',
  'theme.midnightIris': 'Midnight Iris',

  'error.title': 'Something went wrong',
  'error.body': 'Please try again. If it keeps happening, restart the app.',
  'error.retry': 'Try again',
  'notFound.title': 'Page not found',
  'notFound.body': 'This page doesn’t exist.',
  'notFound.home': 'Go home',
} as const

export type TranslationKey = keyof typeof en

/** A complete set of screen texts for one language. */
export type TextCatalog = Record<TranslationKey, string>

export const translationKeys = Object.keys(en) as TranslationKey[]

export function isTranslationKey(value: string): value is TranslationKey {
  return Object.hasOwn(en, value)
}
