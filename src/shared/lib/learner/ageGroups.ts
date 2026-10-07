import type { TranslationKey } from '@/shared/lib/i18n'

/**
 * Learner age groups. Fixed in code (not admin settings) because examples, situations and
 * safety rules are chosen per group elsewhere in the app.
 */
export const ageGroups = [
  { id: 'child', labelKey: 'ageGroup.child', rangeKey: 'ageGroup.childRange' },
  { id: 'teen', labelKey: 'ageGroup.teen', rangeKey: 'ageGroup.teenRange' },
  { id: 'adult', labelKey: 'ageGroup.adult', rangeKey: 'ageGroup.adultRange' },
] as const satisfies readonly { id: string; labelKey: TranslationKey; rangeKey: TranslationKey }[]

export type AgeGroupId = (typeof ageGroups)[number]['id']

export const DEFAULT_AGE_GROUP: AgeGroupId = 'adult'

export function isAgeGroupId(value: unknown): value is AgeGroupId {
  return ageGroups.some((group) => group.id === value)
}
