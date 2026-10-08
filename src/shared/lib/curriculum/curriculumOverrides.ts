import { z } from 'zod'
import { languageTag } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { curriculumKeys, type CurriculumKey } from './curriculum'

/**
 * Course wording an admin has written, per language: `{ bn: { 'week.16.goal': '…' }, … }`.
 * Edited in Admin › Curriculum. Only the texts an admin changed are stored; everything else
 * comes from the built-in course in `texts/`.
 */
export type CurriculumOverrides = Record<string, Partial<Record<CurriculumKey, string>>>

export const MAX_SECTION_NAME_LENGTH = 60
export const MAX_WEEK_TEXT_LENGTH = 300
/** An outcome is one line of a list on a phone. */
export const MAX_OUTCOME_LENGTH = 120

export function maxCurriculumTextLength(key: CurriculumKey): number {
  if (key.startsWith('section.')) return MAX_SECTION_NAME_LENGTH
  return key.includes('.outcome.') ? MAX_OUTCOME_LENGTH : MAX_WEEK_TEXT_LENGTH
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Keeps known texts with real wording; drops everything else instead of failing. Languages and
 * texts come out in a fixed order, so equal overrides are always stored the same way.
 */
export const curriculumOverridesSchema = z.unknown().transform((value): CurriculumOverrides => {
  if (!isRecord(value)) return {}

  const overrides: CurriculumOverrides = {}
  for (const language of Object.keys(value).sort()) {
    const entries = value[language]
    if (!languageTag.safeParse(language).success || !isRecord(entries)) continue

    const kept: Partial<Record<CurriculumKey, string>> = {}
    for (const key of curriculumKeys) {
      const text = entries[key]
      if (typeof text !== 'string') continue
      // Each text is one line or one short paragraph, so line breaks are not kept.
      const tidy = text.trim().replace(/\s+/g, ' ')
      if (tidy && tidy.length <= maxCurriculumTextLength(key)) kept[key] = tidy
    }
    if (Object.keys(kept).length > 0) overrides[language] = kept
  }
  return overrides
})

export const defaultCurriculumOverrides: CurriculumOverrides = {}

export const CURRICULUM_CONFIG_NAME = 'curriculum'

/**
 * The overrides with one text set, or back on the built-in wording when `text` is `undefined`.
 * What is being typed is kept as it is (the schema tidies it on save); the order is the
 * schema's, so undoing an edit leaves the overrides exactly as they were.
 */
export function withCurriculumText(
  overrides: CurriculumOverrides,
  language: string,
  key: CurriculumKey,
  text: string | undefined,
): CurriculumOverrides {
  const edited: Partial<Record<CurriculumKey, string>> = { ...overrides[language], [key]: text }
  const forLanguage: Partial<Record<CurriculumKey, string>> = {}
  for (const known of curriculumKeys) {
    const value = edited[known]
    if (value !== undefined) forLanguage[known] = value
  }

  const next: CurriculumOverrides = {}
  for (const code of [...new Set([...Object.keys(overrides), language])].sort()) {
    const texts = code === language ? forLanguage : overrides[code]
    if (texts && Object.keys(texts).length > 0) next[code] = texts
  }
  return next
}

export function useCurriculumOverrides(): CurriculumOverrides {
  return useAppConfig({
    name: CURRICULUM_CONFIG_NAME,
    schema: curriculumOverridesSchema,
    defaults: defaultCurriculumOverrides,
  })
}
