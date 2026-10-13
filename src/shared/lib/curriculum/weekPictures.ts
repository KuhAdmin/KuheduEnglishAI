import { parseByWeek, parseWeekPicture } from '@kuhedu/contracts'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'

/**
 * The picture of each week's real-life situation, by week number: `{ 20: '…' }`. Uploaded in
 * Admin › Curriculum. A week without one shows a drawn stand-in. The same picture is shown in
 * every language.
 */
export type WeekPictures = Partial<Record<number, string>>

/** Keeps safe image sources for weeks that exist; drops everything else instead of failing. */
export const weekPicturesSchema = z
  .unknown()
  .transform((value): WeekPictures => parseByWeek(value, parseWeekPicture))

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
