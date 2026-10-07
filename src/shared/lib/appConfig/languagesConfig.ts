import { z } from 'zod'
import { assetUrl, languageTag, text } from './fields'

/**
 * Languages a learner can choose from — the mother tongue in which they see the app and get
 * explanations while learning English. Edited in Admin › Languages.
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
