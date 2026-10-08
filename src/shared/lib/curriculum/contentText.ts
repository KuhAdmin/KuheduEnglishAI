import { languageTag } from '../appConfig/fields'

/**
 * Reading lesson content back from settings storage, where anything may have been put: the
 * pieces every day's schema shares.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A text with its spaces tidied; empty when it is not a text, or longer than allowed. */
export const tidy = (value: unknown, max: number): string => {
  if (typeof value !== 'string') return ''
  const text = value.trim().replace(/\s+/g, ' ')
  return text.length <= max ? text : ''
}

/** A list of texts: the ones that are usable, up to `maxItems` of them. */
export const tidyList = (value: unknown, max: number, maxItems: number): string[] =>
  (Array.isArray(value) ? value : [])
    .map((item) => tidy(item, max))
    .filter((text) => text !== '')
    .slice(0, maxItems)

/**
 * Something written once per language, by language tag. Keeps the languages that have a usable
 * entry, in a fixed order so that the same content always reads back the same.
 */
export function byLanguage<T>(
  value: unknown,
  parse: (entry: unknown) => T | null,
): Record<string, T> {
  const entries: Record<string, T> = {}
  const given = isRecord(value) ? value : {}
  for (const language of Object.keys(given).sort()) {
    const entry = parse(given[language])
    if (languageTag.safeParse(language).success && entry !== null) entries[language] = entry
  }
  return entries
}

/** One text per language. */
export const tidyByLanguage = (value: unknown, max: number): Record<string, string> =>
  byLanguage(value, (entry) => tidy(entry, max) || null)
