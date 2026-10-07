import { z } from 'zod'

/**
 * Building blocks for admin-managed settings schemas (see CLAUDE.md, "Admin-managed settings").
 * Pair each field with `.catch(default)` so one bad value never breaks a screen.
 */

const MAX_URL_LENGTH = 2048
/** About 1 MB of image once base64-encoded. */
const MAX_DATA_URL_LENGTH = 1_400_000

/** A picture uploaded in the admin area and kept in the browser. Raster only: no SVG, no HTML. */
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

/** URL of an image an admin uploaded or picked. */
export const assetUrl = z.string().refine(isSafeAssetUrl)

/** Required, trimmed, length-limited text. */
export const text = (max: number) => z.string().trim().min(1).max(max)

/** Optional text: empty means "not set". */
export const optionalText = (max: number) => z.string().trim().max(max).catch('')

/** BCP-47 language tag, e.g. `bn`, `hi`, `en-IN`. */
export const languageTag = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)

/** A settings group that may be absent from the payload; its fields then use their defaults. */
export const section = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.preprocess((value) => value ?? {}, z.object(shape))
