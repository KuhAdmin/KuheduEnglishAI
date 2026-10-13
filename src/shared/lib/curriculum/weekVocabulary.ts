import {
  parseByWeek,
  parseWeekVocabulary,
  type VocabularyWord,
  type WeekVocabulary,
} from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { tipsIn } from './contentText'
import { week1Vocabulary } from './vocabulary/week1'

// What a word is, how long it may be and how a week's words are read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
export {
  MAX_MEANING_LENGTH,
  MAX_PHONETIC_LENGTH,
  MAX_SYLLABLE_LENGTH,
  MAX_SYLLABLES,
  MAX_VOCABULARY_WORDS,
  MAX_WORD_LENGTH,
  MAX_WORD_TIP_LENGTH,
  MAX_WORD_TIPS,
  syllableLetters,
  syllablesSpell,
  type SyllableLetters,
  type VocabularyWord,
  type WeekVocabulary,
} from '@kuhedu/contracts'

/** Vocabulary by week number. */
export type WeekVocabularies = Partial<Record<number, WeekVocabulary>>

/** A word's picture is small and square; shown at up to half a phone's width. */
export const WORD_PICTURE_BOUNDS = { maxWidth: 320, maxHeight: 320 }

/** The vocabulary that ships with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekVocabularies: WeekVocabularies = { 1: week1Vocabulary }

/**
 * Vocabulary an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the entries
 * that have a word, and the weeks that have at least one; drops everything else instead of
 * failing.
 */
export const weekVocabulariesSchema = z
  .unknown()
  .transform((value): WeekVocabularies => parseByWeek(value, parseWeekVocabulary))

export const defaultWeekVocabularies: WeekVocabularies = {}

export const WEEK_VOCABULARY_CONFIG_NAME = 'week-vocabulary'

/** A week's words: the admin's if they wrote some, else the built-in ones, else none. */
export function weekVocabulary(
  week: number,
  overrides: WeekVocabularies = {},
): WeekVocabulary | null {
  return overrides[week] ?? builtInWeekVocabularies[week] ?? null
}

/** A word's meaning in a learner's language; `bn-IN` falls back to `bn`. */
export function wordMeaning(word: VocabularyWord, language: string): string | undefined {
  return word.meanings[language] ?? word.meanings[primarySubtag(language)]
}

/** A word's tips for a learner: in their language if it has any, else in English. */
export const wordTips = (word: VocabularyWord, language: string) => tipsIn(word.tips, language)

/** A week's words, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekVocabulary(week: number): WeekVocabulary | null {
  const overrides = useAppConfig({
    name: WEEK_VOCABULARY_CONFIG_NAME,
    schema: weekVocabulariesSchema,
    defaults: defaultWeekVocabularies,
  })
  return useMemo(() => weekVocabulary(week, overrides), [week, overrides])
}
