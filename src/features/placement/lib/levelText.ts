import { fillText, type Translate, type TranslationKey } from '@/shared/lib/i18n'
import type { Level } from '../types'

/** "Level A1", or the lowest level's own name. Level codes are the same in every language. */
export function levelLabel(t: Translate, level: Level): string {
  return level === 'FOUNDATION'
    ? t('placementTest.levelFoundation')
    : fillText(t('placementTest.level'), { level })
}

/** The encouraging line about what learning starts with at each level. */
export const levelPromiseKeys = {
  FOUNDATION: 'placementTest.result.foundation',
  A1: 'placementTest.result.a1',
  A2: 'placementTest.result.a2',
  B1: 'placementTest.result.b1',
  'B2+': 'placementTest.result.b2',
} as const satisfies Record<Level, TranslationKey>
