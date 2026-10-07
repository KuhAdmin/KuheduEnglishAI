import { z } from 'zod'
import { languageTag } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { isTranslationKey, type TranslationKey } from './en'

/**
 * Screen texts an admin has written, per language: `{ bn: { 'home.title': '…' }, … }`.
 * Edited in Admin › Screen texts. Only the texts an admin changed are stored; everything else
 * comes from the built-in catalogs.
 */
export type ScreenTexts = Record<string, Partial<Record<TranslationKey, string>>>

export const MAX_SCREEN_TEXT_LENGTH = 300

/** Keeps known keys with real text; drops everything else instead of failing. */
export const screenTextsSchema = z.unknown().transform((value): ScreenTexts => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const texts: ScreenTexts = {}
  for (const [language, entries] of Object.entries(value)) {
    if (!languageTag.safeParse(language).success) continue
    if (typeof entries !== 'object' || entries === null) continue

    const kept: Partial<Record<TranslationKey, string>> = {}
    for (const [key, text] of Object.entries(entries)) {
      if (!isTranslationKey(key) || typeof text !== 'string') continue
      const trimmed = text.trim()
      if (trimmed && trimmed.length <= MAX_SCREEN_TEXT_LENGTH) kept[key] = trimmed
    }
    if (Object.keys(kept).length > 0) texts[language] = kept
  }
  return texts
})

export const defaultScreenTexts: ScreenTexts = {}

export const SCREEN_TEXTS_CONFIG_NAME = 'screen-texts'

export function useScreenTexts(): ScreenTexts {
  return useAppConfig({
    name: SCREEN_TEXTS_CONFIG_NAME,
    schema: screenTextsSchema,
    defaults: defaultScreenTexts,
  })
}
