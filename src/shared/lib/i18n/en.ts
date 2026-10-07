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

  // The test itself. `{language}` and `{level}` are filled in while the screen is shown.
  'placementTest.pause': 'Pause test',
  'placementTest.progress': 'Test progress',
  'placementTest.notSure': 'I’m not sure',
  'placementTest.answers': 'Answers',
  'placementTest.help.title': 'Need help?',
  'placementTest.help.showText': 'Show the text',
  'placementTest.help.textLabel': 'What was said',
  'placementTest.help.translate': 'See it in {language}',
  'placementTest.help.example': 'Hear an example',
  'placementTest.help.skip': 'Skip this question',
  'placementTest.listen.introTitle': 'First, let’s listen',
  'placementTest.listen.introBody':
    'You’ll hear short English sentences. Turn your sound on — you can listen as many times as you like.',
  'placementTest.listen.noAudio':
    'This device can’t play the audio, so we’ll leave out the listening part.',
  'placementTest.listen.instruction': 'Listen and choose the answer',
  'placementTest.listen.play': 'Play',
  'placementTest.listen.playing': 'Playing…',
  'placementTest.listen.replay': 'Play again',
  'placementTest.listen.slow': 'Play slowly',
  'placementTest.listen.first': 'Listen first, then choose your answer.',
  'placementTest.listen.failed': 'We couldn’t play the audio.',
  'placementTest.listen.retry': 'Try Again',
  'placementTest.listen.skip': 'Skip',
  'placementTest.understand.introTitle': 'Now, a few questions',
  'placementTest.understand.introBody':
    'Choose the best answer. If you don’t know one, that’s fine — just say so.',
  'placementTest.understand.instruction': 'Choose the best answer',
  'placementTest.speak.introTitle': 'Last part: let’s hear you speak',
  'placementTest.speak.introBody': 'You’ll answer up to three short questions out loud.',
  'placementTest.speak.micWhy': 'We need your microphone for the speaking part.',
  'placementTest.speak.privacy': 'Your recording stays on this device and is not saved.',
  'placementTest.speak.allow': 'Allow microphone',
  'placementTest.speak.checking': 'Checking the microphone…',
  'placementTest.speak.denied': 'The microphone is blocked for this app.',
  'placementTest.speak.deniedAndroid':
    'On Android: tap the icon beside the web address, open Permissions and allow Microphone.',
  'placementTest.speak.deniedIos':
    'On iPhone: open Settings, then Safari, then Microphone, and choose Allow.',
  'placementTest.speak.unavailable': 'We couldn’t find a microphone we can use on this device.',
  'placementTest.speak.checkMic': 'Check Microphone',
  'placementTest.speak.without': 'Continue without speaking',
  'placementTest.speak.instruction': 'Say it out loud',
  'placementTest.speak.hearIt': 'Hear the question',
  'placementTest.speak.tapToSpeak': 'Tap to speak',
  'placementTest.speak.stop': 'Stop recording',
  'placementTest.speak.recording': 'Recording…',
  'placementTest.speak.recorded': 'Got it! You can listen, or try again.',
  'placementTest.speak.listen': 'Listen',
  'placementTest.speak.tryAgain': 'Try again',
  'placementTest.speak.cantAnswer': 'I can’t answer this yet',
  'placementTest.resume.title': 'Welcome back!',
  'placementTest.resume.body': 'Your placement test is waiting for you.',
  'placementTest.paused.title': 'Test paused',
  'placementTest.paused.body': 'Your answers are saved. Continue whenever you’re ready.',
  'placementTest.resume.continue': 'Continue Test',
  'placementTest.resume.restart': 'Start Again',
  'placementTest.resume.later': 'Finish later',
  'placementTest.restart.confirm': 'Start again? Your answers so far will be cleared.',
  'placementTest.restart.yes': 'Yes, start again',
  'placementTest.restart.no': 'Keep my answers',
  'placementTest.result.title': 'We’ve found your starting point!',
  'placementTest.result.ready': 'You’re ready to begin at {level}.',
  'placementTest.level': 'Level {level}',
  'placementTest.levelFoundation': 'Foundation level',
  'placementTest.result.foundation':
    'We’ll start with first words and simple greetings, one step at a time.',
  'placementTest.result.a1':
    'We’ll start with simple conversations and gradually help you speak more confidently.',
  'placementTest.result.a2':
    'We’ll build on what you know with everyday conversations and longer answers.',
  'placementTest.result.b1':
    'We’ll work on speaking freely about your life, your work and your opinions.',
  'placementTest.result.b2':
    'We’ll sharpen your fluency with richer conversations and finer points.',
  'placementTest.result.basis':
    'Based on your listening and understanding. Speaking isn’t scored yet.',
  'placementTest.result.promise': 'A starting point is not a limit — it moves as you learn.',
  'placementTest.result.start': 'Start My Learning Journey',
  'placementTest.result.details': 'See My Results',
  'placementTest.result.listening': 'Listening',
  'placementTest.result.understanding': 'Understanding',
  'placementTest.result.speaking': 'Speaking',
  'placementTest.result.notScored': 'Not scored yet',
  'placementTest.result.notChecked': 'Not checked this time',
  'placementTest.result.retake': 'Take the test again',

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
