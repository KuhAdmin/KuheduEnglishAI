import { z } from 'zod'
import { LANGUAGE_TAG, type LEARNER_AGE_GROUPS } from '../api/me.ts'
import { assetUrl, languageTag, optionalText, section, text } from './fields.ts'

/**
 * What an admin manages besides the lessons, as the app's screens read it and the server keeps
 * it. Two shapes: three small objects saved whole (`APP_CONFIG_NAMES`), and the reworded texts
 * of two settings objects, kept one text at a time (`TEXT_SCOPES`). In both only what an admin
 * wrote is stored; what is built in stays in the app.
 */

// ---------------------------------------------------------------------------------------------
// Landing page (Admin › Landing page)
// ---------------------------------------------------------------------------------------------

/**
 * The landing page comes before the learner has chosen a language, so its wording is content
 * the admin writes for everyone — it is not part of the per-language screen texts. Instead the
 * headline is written once per language, and the page rotates through them.
 * Every field falls back to its default when missing or invalid.
 */
export const MAX_HEADLINES = 8

const headlineSchema = z.object({
  /** BCP-47 language of this headline, for correct fonts and screen-reader pronunciation. */
  lang: languageTag,
  text: text(120),
  /** Optional smaller line under the headline. */
  subtext: optionalText(160),
})

export type LandingHeadline = z.infer<typeof headlineSchema>

// Content defaults. The Bengali line is from the brand mockup; all three say
// "Come, let's learn English in real situations".
const defaultHeadlines: LandingHeadline[] = [
  { lang: 'bn', text: 'আসুন, বাস্তব পরিস্থিতিতে ইংরেজি শিখি', subtext: '' },
  { lang: 'hi', text: 'आइए, असल परिस्थितियों में अंग्रेज़ी सीखें', subtext: '' },
  { lang: 'en', text: 'Let’s learn English in real-life situations', subtext: '' },
]

export const landingDefaults = {
  // The logo at the size a screen needs, made from `public/logo.png` with the other icons
  // (`npm run generate-pwa-assets`): 7 KB, where the picture itself is 210 KB.
  logoUrl: '/pwa-192x192.png',
  brandName: 'Kuhedu Lingo',
  tagline: 'The Fluency App',
  headlines: defaultHeadlines,
  primaryLabel: 'Get Started',
  signInPrompt: 'Already have an account?',
  signInLabel: 'Sign in',
} as const

/** Keeps the valid headlines, in order; an unusable list falls back to the defaults. */
const headlineList = z.preprocess((value): LandingHeadline[] => {
  if (!Array.isArray(value)) return defaultHeadlines

  const headlines = value
    .map((item) => headlineSchema.safeParse(item))
    .flatMap((result) => (result.success ? [result.data] : []))
    .slice(0, MAX_HEADLINES)
  return headlines.length > 0 ? headlines : defaultHeadlines
}, z.array(headlineSchema))

/**
 * Settings saved before headlines became a list had a single `headline` (+ `headlineLang`,
 * `subheadline`). Carry that over as a one-item list instead of silently losing it.
 */
function migrateSingleHeadline(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return {}
  const legacy = value as { headlines?: unknown; headline?: unknown; headlineLang?: unknown }
  if (legacy.headlines !== undefined || typeof legacy.headline !== 'string') return value
  return {
    headlines: [
      {
        lang: legacy.headlineLang ?? 'bn',
        text: legacy.headline,
        subtext: (value as { subheadline?: unknown }).subheadline ?? '',
      },
    ],
  }
}

export const landingConfigSchema = z.object({
  brand: section({
    logoUrl: assetUrl.catch(landingDefaults.logoUrl),
    name: text(40).catch(landingDefaults.brandName),
    tagline: z.string().trim().max(60).catch(landingDefaults.tagline),
  }),
  hero: section({
    /** Portrait image (recommended 1080×1920). `null` shows the themed placeholder. */
    imageUrl: assetUrl.nullable().catch(null),
    /** Empty when the image is decorative. */
    imageAlt: optionalText(160),
    /** Which part of the image stays visible when it is cropped to the screen. */
    focalPoint: z.enum(['top', 'center', 'bottom']).catch('top'),
  }),
  overlay: z.preprocess(
    migrateSingleHeadline,
    z.object({
      /** Shown one at a time, in this order, sliding to the next every few seconds. */
      headlines: headlineList,
    }),
  ),
  cta: section({
    primaryLabel: text(30).catch(landingDefaults.primaryLabel),
    signInPrompt: z.string().trim().max(60).catch(landingDefaults.signInPrompt),
    signInLabel: text(30).catch(landingDefaults.signInLabel),
  }),
})

export type LandingConfig = z.infer<typeof landingConfigSchema>

export const defaultLandingConfig: LandingConfig = landingConfigSchema.parse({})

export const LANDING_CONFIG_NAME = 'landing'

// ---------------------------------------------------------------------------------------------
// Languages (Admin › Languages)
// ---------------------------------------------------------------------------------------------

/**
 * Languages a learner can choose from — the mother tongue in which they see the app and get
 * explanations while learning English.
 */
export const MAX_LANGUAGES = 30

export const languageSchema = z.object({
  /** BCP-47 tag; also the value saved as the learner's language. */
  code: languageTag,
  /** The language's own name, in its own script (e.g. "বাংলা"). */
  nativeName: text(40),
  /** Short note shown in brackets, usually the English name (e.g. "Bengali"). */
  caption: z.string().trim().max(40).catch(''),
  /** Flag or emblem image, shown in a circle (square SVG/PNG works best). `null` shows initials. */
  flagUrl: assetUrl.nullable().catch(null),
})

export type SupportLanguage = z.infer<typeof languageSchema>

const defaultLanguages: SupportLanguage[] = [
  { code: 'bn', nativeName: 'বাংলা', caption: 'Bengali', flagUrl: '/flags/in.svg' },
  { code: 'hi', nativeName: 'हिन्दी', caption: 'Hindi', flagUrl: '/flags/in.svg' },
  { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: '/flags/us.svg' },
]

/** Keeps the valid, unique entries of a list; an unusable list falls back to the defaults. */
const languageList = z.preprocess((value): SupportLanguage[] => {
  if (!Array.isArray(value)) return defaultLanguages

  const seen = new Set<string>()
  const languages: SupportLanguage[] = []
  for (const item of value) {
    const result = languageSchema.safeParse(item)
    if (!result.success || seen.has(result.data.code)) continue
    seen.add(result.data.code)
    languages.push(result.data)
    if (languages.length === MAX_LANGUAGES) break
  }
  return languages.length > 0 ? languages : defaultLanguages
}, z.array(languageSchema))

export const languagesConfigSchema = z.object({
  /** Shown in this order. */
  languages: languageList,
  /** Pre-selected when nothing better is known about the learner. */
  defaultCode: languageTag.catch('bn'),
})

export type LanguagesConfig = z.infer<typeof languagesConfigSchema>

export const defaultLanguagesConfig: LanguagesConfig = languagesConfigSchema.parse({})

export const LANGUAGES_CONFIG_NAME = 'languages'

// ---------------------------------------------------------------------------------------------
// Profile pictures (Admin › Profile pictures)
// ---------------------------------------------------------------------------------------------

/**
 * Pictures for the "Tell us about yourself" step. Each age group has two images — one male,
 * one female — and the screen alternates between them, so every learner sees someone like
 * themselves.
 */
type AgeGroup = (typeof LEARNER_AGE_GROUPS)[number]

/** The bundled picture an age group falls back to. */
export const defaultAvatarUrl = (group: AgeGroup, gender: 'male' | 'female') =>
  `/avatars/${group}-${gender}.svg`

/** Square image, shown in a circle (recommended 256×256). */
const avatarPair = (group: AgeGroup) =>
  section({
    maleImageUrl: assetUrl.catch(defaultAvatarUrl(group, 'male')),
    femaleImageUrl: assetUrl.catch(defaultAvatarUrl(group, 'female')),
  })

export const profilesConfigSchema = z.object({
  child: avatarPair('child'),
  teen: avatarPair('teen'),
  adult: avatarPair('adult'),
} satisfies Record<AgeGroup, unknown>)

export type ProfilesConfig = z.infer<typeof profilesConfigSchema>

export const defaultProfilesConfig: ProfilesConfig = profilesConfigSchema.parse({})

export const PROFILES_CONFIG_NAME = 'learner-profiles'

// ---------------------------------------------------------------------------------------------
// What the server keeps
// ---------------------------------------------------------------------------------------------

/** The settings objects kept whole, by the name the app reads them under. */
export const APP_CONFIG_NAMES = [
  LANDING_CONFIG_NAME,
  LANGUAGES_CONFIG_NAME,
  PROFILES_CONFIG_NAME,
] as const

export type AppConfigName = (typeof APP_CONFIG_NAMES)[number]

const APP_CONFIG_SCHEMAS = {
  landing: landingConfigSchema,
  languages: languagesConfigSchema,
  'learner-profiles': profilesConfigSchema,
} satisfies Record<AppConfigName, z.ZodType>

/**
 * A settings object as its screens read it: every field present, each bad one at its default.
 * The server stores this, so what it keeps is always something a screen can show.
 */
export const parseAppConfig = (name: AppConfigName, value: unknown): unknown =>
  APP_CONFIG_SCHEMAS[name].parse(value)

/**
 * Whose texts a reworded text belongs to: the app's `screen-texts` (keys like `home.title`) or
 * its `curriculum` (keys like `week.16.goal`).
 */
export const TEXT_SCOPES = ['screen', 'curriculum'] as const

export type TextScope = (typeof TEXT_SCOPES)[number]

/** The settings object each scope's texts are read from in the app. */
export const TEXT_SCOPE_SETTINGS = {
  screen: 'screen-texts',
  curriculum: 'curriculum',
} as const satisfies Record<TextScope, string>

/**
 * A text's key, by form only: which keys exist is the app's to say, so the server keeps any
 * key of this form and an app that no longer has it never asks for it.
 */
export const TEXT_KEY = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/
export const MAX_TEXT_KEY_LENGTH = 120
/** The longest any reworded text may be: a screen text's and a week's paragraph's limit. */
export const MAX_OVERRIDE_TEXT_LENGTH = 300

/** Whether a language, key and text are something the server keeps. */
export function isKeptText(language: string, key: string, text: string): boolean {
  const trimmed = text.trim()
  return (
    LANGUAGE_TAG.test(language) &&
    language.length <= 35 &&
    TEXT_KEY.test(key) &&
    key.length <= MAX_TEXT_KEY_LENGTH &&
    trimmed !== '' &&
    trimmed === text &&
    text.length <= MAX_OVERRIDE_TEXT_LENGTH
  )
}
