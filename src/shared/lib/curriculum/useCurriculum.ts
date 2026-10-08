import { useMemo } from 'react'
import { DEFAULT_LANGUAGE, primarySubtag, useLanguage } from '@/shared/lib/i18n'
import {
  outcomeKey,
  OUTCOMES_PER_WEEK,
  SECTION_COUNT,
  sectionKey,
  sectionWeeks,
  WEEK_TEXT_FIELDS,
  weekKey,
  type CurriculumKey,
  type CurriculumTexts,
  type WeekSummary,
} from './curriculum'
import { useCurriculumOverrides, type CurriculumOverrides } from './curriculumOverrides'
import { bn } from './texts/bn'
import { en } from './texts/en'
import { hi } from './texts/hi'

/** Languages the course is written in. Any other language reads it in English. */
export const curriculumTexts: Record<string, CurriculumTexts> = { en, bn, hi }

type TextsByKey = Partial<Record<CurriculumKey, string>>

function byKey(texts: CurriculumTexts): TextsByKey {
  const flat: TextsByKey = {}
  texts.sections.forEach((title, index) => {
    flat[sectionKey(index + 1)] = title
  })
  texts.weeks.forEach((week, index) => {
    for (const field of WEEK_TEXT_FIELDS) flat[weekKey(index + 1, field)] = week[field]
    week.outcomes.forEach((outcome, position) => {
      flat[outcomeKey(index + 1, position + 1)] = outcome
    })
  })
  return flat
}

const builtIn: Record<string, TextsByKey> = Object.fromEntries(
  Object.entries(curriculumTexts).map(([language, texts]) => [language, byKey(texts)]),
)

/** The course as it ships in a language (or in its base language), if it is written in it. */
export const builtInCurriculum = (language: string): TextsByKey | undefined =>
  builtIn[language] ?? builtIn[primarySubtag(language)]

/**
 * One text of the course in a language. Looks, in order, at: the admin's text for that language,
 * the built-in text for that language, the admin's English text, the built-in English text —
 * the same way screen texts do. A regional code (`bn-IN`) falls back to its base (`bn`).
 */
export function curriculumText(
  language: string,
  key: CurriculumKey,
  overrides: CurriculumOverrides = {},
): string {
  for (const code of new Set([language, primarySubtag(language), DEFAULT_LANGUAGE])) {
    const text = overrides[code]?.[key] || builtIn[code]?.[key]
    if (text) return text
  }
  return ''
}

export type CurriculumWeek = WeekSummary & { week: number; outcomes: string[] }

export type CurriculumSection = {
  /** 1 to 10. */
  section: number
  title: string
  firstWeek: number
  lastWeek: number
  weeks: CurriculumWeek[]
}

/** The whole course in a language, with an admin's wording where they wrote their own. */
export function getCurriculum(
  language: string,
  overrides: CurriculumOverrides = {},
): CurriculumSection[] {
  const text = (key: CurriculumKey) => curriculumText(language, key, overrides)

  return Array.from({ length: SECTION_COUNT }, (_, index) => {
    const section = index + 1
    const weeks = sectionWeeks(section)
    return {
      section,
      title: text(sectionKey(section)),
      firstWeek: weeks[0] ?? 1,
      lastWeek: weeks.at(-1) ?? 1,
      weeks: weeks.map((week) => ({
        week,
        goal: text(weekKey(week, 'goal')),
        context: text(weekKey(week, 'context')),
        challenge: text(weekKey(week, 'challenge')),
        outcomes: Array.from({ length: OUTCOMES_PER_WEEK }, (_, index) =>
          text(outcomeKey(week, index + 1)),
        ),
      })),
    }
  })
}

/** The course in the learner's language; follows an admin's edits as they are saved. */
export function useCurriculum(): CurriculumSection[] {
  const language = useLanguage()
  const overrides = useCurriculumOverrides()
  return useMemo(() => getCurriculum(language, overrides), [language, overrides])
}
