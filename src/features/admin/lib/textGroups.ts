import { translationKeys, type TranslationKey } from '@/shared/lib/i18n'
import { adminText } from '../adminText'

export type TextGroupId = keyof typeof adminText.texts.groups

/**
 * Which screen each text belongs to, by key prefix. Order matters: the first match wins, so
 * specific prefixes come before general ones. Unmatched keys land in "Other", which means a
 * newly added text always shows up in the editor even before it is listed here.
 */
const groupPrefixes: { id: TextGroupId; prefixes: string[] }[] = [
  { id: 'language', prefixes: ['onboarding.language.'] },
  { id: 'profile', prefixes: ['onboarding.profile.', 'ageGroup.'] },
  { id: 'placement', prefixes: ['onboarding.placement.', 'placementTest.'] },
  { id: 'onboarding', prefixes: ['onboarding.'] },
  {
    id: 'main',
    prefixes: ['home.', 'journey.', 'week.', 'lessonDay.', 'practice.', 'lessons.', 'progress.'],
  },
  { id: 'profileScreen', prefixes: ['profile.', 'theme.'] },
  { id: 'signIn', prefixes: ['auth.'] },
  { id: 'errors', prefixes: ['error.', 'notFound.'] },
  { id: 'app', prefixes: ['app.', 'nav.', 'landing.'] },
]

/** The order groups are shown in: the learner's journey first, housekeeping last. */
const displayOrder: TextGroupId[] = [
  'signIn',
  'language',
  'profile',
  'placement',
  'onboarding',
  'main',
  'profileScreen',
  'errors',
  'app',
  'other',
]

export function groupOfText(key: string): TextGroupId {
  return (
    groupPrefixes.find((group) => group.prefixes.some((prefix) => key.startsWith(prefix)))?.id ??
    'other'
  )
}

/** All text keys, grouped by screen, in display order; empty groups are left out. */
export function groupTextKeys(
  keys: readonly TranslationKey[] = translationKeys,
): { id: TextGroupId; title: string; keys: TranslationKey[] }[] {
  return displayOrder
    .map((id) => ({
      id,
      title: adminText.texts.groups[id],
      keys: keys.filter((key) => groupOfText(key) === id),
    }))
    .filter((group) => group.keys.length > 0)
}
