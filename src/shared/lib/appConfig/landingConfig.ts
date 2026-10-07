import { z } from 'zod'
import { assetUrl, languageTag, optionalText, section, text } from './fields'

/**
 * Landing-page settings, edited in Admin › Landing page.
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
  logoUrl: '/logo.svg',
  brandName: 'Kuhedu English',
  tagline: 'Speak English. Live it.',
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
