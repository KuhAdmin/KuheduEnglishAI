import { bn } from './bn'
import { en, type TextCatalog, type TranslationKey } from './en'
import { hi } from './hi'
import type { ScreenTexts } from './screenTexts'

/** Languages that ship with a full set of texts. Any other language shows English until an
 *  admin writes its texts. */
export const builtInCatalogs: Record<string, TextCatalog> = { en, bn, hi }

export const DEFAULT_LANGUAGE = 'en'

export const primarySubtag = (language: string) => language.toLowerCase().split('-')[0] ?? language

/** True when the learner chose English itself, i.e. there is no mother tongue to support. */
export const isEnglish = (language: string) => primarySubtag(language) === 'en'

/**
 * The text for a key in a language. Looks, in order, at: the admin's text for that language,
 * the built-in text for that language, the admin's English text, the built-in English text.
 * A regional code (`bn-IN`) falls back to its base language (`bn`).
 */
export function translate(
  language: string,
  key: TranslationKey,
  adminTexts: ScreenTexts = {},
): string {
  for (const code of new Set([language, primarySubtag(language), DEFAULT_LANGUAGE])) {
    const text = adminTexts[code]?.[key] ?? builtInCatalogs[code]?.[key]
    if (text) return text
  }
  return en[key]
}
