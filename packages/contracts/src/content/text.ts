import { LANGUAGE_TAG } from '../api/me.ts'

/**
 * Reading content back from wherever it was kept (a browser's storage, the database, a file
 * someone wrote), where anything may have been put: the pieces every kind of content shares.
 * Nothing here fails: what is not usable is left out.
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
    if (LANGUAGE_TAG.test(language) && entry !== null) entries[language] = entry
  }
  return entries
}

/** One text per language. */
export const tidyByLanguage = (value: unknown, max: number): Record<string, string> =>
  byLanguage(value, (entry) => tidy(entry, max) || null)

/** A few short texts per language (tips); a language with none usable is left out. */
export const tidyListByLanguage = (
  value: unknown,
  max: number,
  maxItems: number,
): Record<string, string[]> =>
  byLanguage(value, (entry) => {
    const list = tidyList(entry, max, maxItems)
    return list.length > 0 ? list : null
  })

const MAX_URL_LENGTH = 2048
/** About 1 MB of image once base64-encoded. */
const MAX_DATA_URL_LENGTH = 1_400_000

/** A picture uploaded in the admin area. Raster only: no SVG, no HTML. */
const RASTER_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/

/**
 * Safe image source: an https URL, a root-relative path, or an uploaded raster image.
 * Never `javascript:`, protocol-relative URLs or other `data:` types.
 */
export function isSafeAssetUrl(value: string): boolean {
  if (value.startsWith('data:')) {
    return value.length <= MAX_DATA_URL_LENGTH && RASTER_DATA_URL.test(value)
  }
  if (value.length > MAX_URL_LENGTH) return false
  return /^https:\/\//i.test(value) || (value.startsWith('/') && !value.startsWith('//'))
}

/**
 * Safe source of a video or sound kept elsewhere: an https URL or a root-relative path. Never
 * a `data:` URL: media is far too big to be kept with the content.
 */
export function isSafeMediaUrl(value: string): boolean {
  return !value.startsWith('data:') && isSafeAssetUrl(value)
}
