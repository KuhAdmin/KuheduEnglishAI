import {
  parseByWeek,
  parseWeekSentences,
  type PracticeSentence,
  type WeekSentences,
} from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { tipsIn } from './contentText'
import { week1Sentences } from './sentences/week1'

// What a sentence is, how long it may be and how a week's sentences are read back are written
// once, in `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
export {
  MAX_ALSO_ACCEPTED,
  MAX_SENTENCE_LENGTH,
  MAX_SENTENCE_TRANSLATION_LENGTH,
  MAX_SENTENCES,
  MAX_TIP_LENGTH,
  MAX_TIPS,
  type PracticeSentence,
  type WeekSentences,
} from '@kuhedu/contracts'

/** Sentences by week number. */
export type WeekSentencesByWeek = Partial<Record<number, WeekSentences>>

/** The sentences that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekSentences: WeekSentencesByWeek = { 1: week1Sentences }

/**
 * Sentences an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the entries
 * that have an English sentence, and the weeks that have at least one; drops everything else
 * instead of failing.
 */
export const weekSentencesSchema = z
  .unknown()
  .transform((value): WeekSentencesByWeek => parseByWeek(value, parseWeekSentences))

export const defaultWeekSentences: WeekSentencesByWeek = {}

export const WEEK_SENTENCES_CONFIG_NAME = 'week-sentences'

/** A week's sentences: the admin's if they wrote some, else the built-in ones, else none. */
export function weekSentences(
  week: number,
  overrides: WeekSentencesByWeek = {},
): WeekSentences | null {
  return overrides[week] ?? builtInWeekSentences[week] ?? null
}

/** A sentence in a learner's language; `bn-IN` falls back to `bn`. */
export function sentenceTranslation(
  sentence: PracticeSentence,
  language: string,
): string | undefined {
  return sentence.translations[language] ?? sentence.translations[primarySubtag(language)]
}

/**
 * A sentence's tips for a learner: in their language if it has any, else in English. `lang` is
 * the language they are written in, for the element that shows them.
 */
export const sentenceTips = (sentence: PracticeSentence, language: string) =>
  tipsIn(sentence.tips, language)

/** Every English sentence that counts as a right translation, the model answer first. */
export const acceptedAnswers = (sentence: PracticeSentence): string[] => [
  sentence.english,
  ...sentence.alsoAccepted,
]

/** A week's sentences, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekSentences(week: number): WeekSentences | null {
  const overrides = useAppConfig({
    name: WEEK_SENTENCES_CONFIG_NAME,
    schema: weekSentencesSchema,
    defaults: defaultWeekSentences,
  })
  return useMemo(() => weekSentences(week, overrides), [week, overrides])
}
