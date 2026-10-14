import { z } from 'zod'
import { LANGUAGE_TAG } from '../api/me.ts'
import { isSafeAssetUrl, isSafeMediaUrl } from './text.ts'

/**
 * Building blocks for admin-managed settings schemas (see CLAUDE.md, "Admin-managed settings").
 * Pair each field with `.catch(default)` so one bad value never breaks a screen.
 */

/** URL of an image an admin uploaded or picked. */
export const assetUrl = z.string().refine(isSafeAssetUrl)

/** URL of a video or sound an admin linked to. */
export const mediaUrl = z.string().refine(isSafeMediaUrl)

/** Required, trimmed, length-limited text. */
export const text = (max: number) => z.string().trim().min(1).max(max)

/** Optional text: empty means "not set". */
export const optionalText = (max: number) => z.string().trim().max(max).catch('')

/** BCP-47 language tag, e.g. `bn`, `hi`, `en-IN`. */
export const languageTag = z.string().regex(LANGUAGE_TAG)

/** A settings group that may be absent from the payload; its fields then use their defaults. */
export const section = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.preprocess((value) => value ?? {}, z.object(shape))
