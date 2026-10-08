/**
 * Wording of the admin area. English only, and deliberately outside the learner-facing screen
 * texts (shared/lib/i18n) so admins are not asked to translate their own tools.
 */
export const adminText = {
  title: 'Kuhedu Admin',
  openApp: 'Open app',
  signOut: 'Sign out',
  sectionsLabel: 'Admin sections',
  localNotice:
    'No database yet: changes are saved in this browser only and show up in other tabs of the same browser.',

  nav: {
    texts: 'Screen texts',
    curriculum: 'Curriculum',
    lessons: 'Lessons',
    landing: 'Landing page',
    languages: 'Languages',
    profiles: 'Profile pictures',
  },

  actions: {
    save: 'Save changes',
    saveShort: 'Save',
    discard: 'Discard',
    resetAll: 'Reset to defaults',
    resetAllShort: 'Reset',
    resetAllConfirm:
      'Reset this section to the built-in defaults? Your saved changes will be lost.',
    saved: 'Saved. Open tabs of the app update straight away.',
    reset: 'Reset to the built-in defaults.',
    unsaved: 'You have unsaved changes.',
    storageFull:
      'Could not save: this browser’s storage is full. Remove or replace some uploaded images and try again.',
  },

  image: {
    upload: 'Upload image',
    replace: 'Replace image',
    useDefault: 'Use default',
    remove: 'Remove image',
    processing: 'Preparing image…',
    failed: 'That file could not be read as an image. Try a PNG, JPEG or WebP file.',
    tooLarge: 'That image is too large even after shrinking. Try a smaller one.',
    none: 'No image',
  },

  /** Shared by the editors of per-language wording (Screen texts, Curriculum). */
  wording: {
    languageLegend: 'Language to edit',
    statusBuiltIn: 'Built-in',
    statusEdited: 'Edited',
    statusMissing: 'Missing — shows English',
    resetOne: 'Reset this text',
  },

  texts: {
    heading: 'Screen texts',
    intro:
      'Every text learners see, in each language. Edit a text to replace the built-in one for that language; pick a screen to see only its texts.',
    screenFilter: 'Screen',
    allScreens: 'All screens',
    search: 'Search texts',
    searchPlaceholder: 'Search by text or key',
    noMatches: 'No texts match your search.',
    /** Extra guidance for a group, shown under its title. */
    groupNotes: {
      signIn:
        '“{brand}” in the title is replaced by the brand name. The brand name, tagline and logo shown on this screen are edited under Landing page.',
    },
    groups: {
      signIn: 'Sign in and sign up',
      language: 'Onboarding · Choose language',
      profile: 'Onboarding · About you',
      placement: 'Onboarding · Placement test',
      onboarding: 'Onboarding · Shared',
      main: 'Home, journey and the other main screens',
      profileScreen: 'Profile and themes',
      app: 'App name and navigation',
      errors: 'Errors',
      other: 'Other',
    },
  },

  curriculum: {
    heading: 'Curriculum',
    intro:
      'The 50-week course learners see on Home, in each language: ten sections of five weeks. Each week has a goal (an “I can …” statement), the real-life situation it is set in, the challenge the learner has to manage there, and an overview screen with a picture and five outcomes.',
    sectionPicker: 'Section',
    section: 'Section',
    weeks: 'Weeks',
    week: 'Week',
    sectionName: 'Section name',
    goal: 'Goal',
    situation: 'Situation',
    challenge: 'Challenge',
    overview: 'Weekly overview',
    overviewNote:
      'Shown when a learner opens the week: the situation above, this picture, and five things they will be able to do. The fifth sums the week up.',
    picture: 'Picture',
    pictureHint:
      'Landscape image, ideally 640 × 360. The same in every language. Without one, a drawing is shown.',
    outcome: 'Outcome',
    english: 'English',
    missing: 'missing',
    previous: 'Previous section',
    next: 'Next section',
  },

  lessons: {
    heading: 'Lessons',
    intro:
      'Day 1 of every week opens with “Watch and listen”: a short conversation set in the week’s situation, which learners hear and read. Write it here, with its translation into each learner language. A week without a conversation tells learners that its lessons are coming soon.',
    weekPicker: 'Week',
    week: 'Week',
    lines: 'lines',
    noConversation: 'no conversation yet',
    translationLegend: 'Translation to write',
    conversation: 'Conversation',
    conversationIntro:
      'In the order it is said. Keep each line to a sentence or two, in words the week teaches.',
    situation: 'This week’s situation',
    empty: 'This week has no conversation yet. Add a line to start one.',
    line: 'Line',
    speaker: 'Speaker',
    english: 'English',
    addLine: 'Add line',
    moveUp: 'Move up: line',
    moveDown: 'Move down: line',
    remove: 'Remove line',
    useBuiltIn: 'Use built-in',
    removeConversation: 'Remove',
    video: 'Video',
    videoIntro:
      'Optional. Without a video, the phone’s own voice reads the conversation over the week’s picture (uploaded under Curriculum). Learners must hear or watch it through once before they can go on.',
    videoUrl: 'Video link',
    videoHint:
      'A link to a video file kept elsewhere, for example an .mp4. A video cannot be uploaded here: there is no server yet.',
    errorSpeaker: 'Enter who says this.',
    errorText: 'Enter what they say.',
    errorVideo: 'Use a link that starts with https://',
    errorNoLines: 'Add the conversation the video shows: at least one line.',
    errorTooMany: 'That is the maximum number of lines.',
    errorOtherWeeks: 'Finish or remove the conversation of week',
  },

  landing: {
    heading: 'Landing page',
    intro: 'The first screen visitors see, before they choose a language.',
    brand: 'Brand',
    logo: 'Logo',
    logoHint: 'Square image, at least 128 × 128.',
    brandName: 'Brand name',
    tagline: 'Tagline',
    hero: 'Hero image',
    heroImage: 'Hero image',
    heroHint: 'Portrait image, ideally 1080 × 1920. Without one, a themed illustration is shown.',
    heroAlt: 'Image description',
    heroAltHint: 'Read aloud by screen readers. Leave empty if the image is only decoration.',
    focalPoint: 'Keep visible when cropped',
    focalTop: 'Top of the image',
    focalCenter: 'Centre of the image',
    focalBottom: 'Bottom of the image',
    overlay: 'Text over the image',
    overlayIntro:
      'Write the headline once per language. The landing page shows them one at a time, sliding to the next every 5 seconds, in this order.',
    headline: 'Headline',
    headlineLang: 'Language of headline',
    subheadline: 'Sub-headline',
    optional: '(optional)',
    addHeadline: 'Add headline',
    moveHeadlineUp: 'Move up: headline',
    moveHeadlineDown: 'Move down: headline',
    removeHeadline: 'Remove headline',
    errorHeadline: 'Enter the headline text.',
    buttons: 'Buttons',
    primaryLabel: 'Main button',
    signInPrompt: 'Text before the sign-in link',
    signInLabel: 'Sign-in link',
  },

  languages: {
    heading: 'Languages',
    intro:
      'The mother tongues learners can choose. The app is shown in the chosen language; add its texts under Screen texts.',
    add: 'Add language',
    language: 'Language',
    flag: 'Flag',
    flagHint: 'Square image; shown in a circle.',
    code: 'Language code',
    codeHint: 'For example bn, hi, ta, en.',
    nativeName: 'Name in its own script',
    caption: 'Note in brackets (optional)',
    captionHint: 'Usually the English name.',
    moveUp: 'Move up',
    moveDown: 'Move down',
    remove: 'Remove language',
    defaultLanguage: 'Pre-selected language',
    defaultHint: 'Suggested when nothing is known about the learner.',
    errorCode: 'Use a short code such as bn or en-IN.',
    errorDuplicate: 'This code is already used by another language.',
    errorName: 'Enter the language name.',
    errorEmpty: 'Keep at least one language.',
    errorTooMany: 'That is the maximum number of languages.',
  },

  profiles: {
    heading: 'Profile pictures',
    intro:
      'Shown on “Tell us about yourself”. Each age group flips between its male and female picture.',
    male: 'Male picture',
    female: 'Female picture',
    hint: 'Square image; shown in a circle.',
    groups: { child: 'Child (6–12)', teen: 'Teenager (13–18)', adult: 'Adult (18+)' },
  },
} as const
