import { z } from 'zod'
import { assetUrl } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { isWeekNumber } from './curriculum'

/**
 * The picture of each week's real-life situation, by week number: `{ 20: '…' }`. Uploaded in
 * Admin › Curriculum. A week without one shows a drawn stand-in. The same picture is shown in
 * every language.
 */
export type WeekPictures = Partial<Record<number, string>>

/** Keeps safe image sources for weeks that exist; drops everything else instead of failing. */
export const weekPicturesSchema = z.unknown().transform((value): WeekPictures => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const pictures: WeekPictures = {}
  for (const [week, url] of Object.entries(value)) {
    // `String(Number(…))` turns away "07" and "7.0", which would be second names for week 7.
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week) continue
    if (assetUrl.safeParse(url).success) pictures[Number(week)] = url as string
  }
  return pictures
})

export const defaultWeekPictures: WeekPictures = {}

export const WEEK_PICTURES_CONFIG_NAME = 'week-pictures'

/** Recommended size of a week's picture: 16:9, as wide as a phone screen at double density. */
export const WEEK_PICTURE_BOUNDS = { maxWidth: 640, maxHeight: 360 }

export function useWeekPictures(): WeekPictures {
  return useAppConfig({
    name: WEEK_PICTURES_CONFIG_NAME,
    schema: weekPicturesSchema,
    defaults: defaultWeekPictures,
  })
}
