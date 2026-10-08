import { useMemo } from 'react'
import { z } from 'zod'
import { isSafeAssetUrl } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { isRecord, tidy, tidyByLanguage } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Vocabulary } from './vocabulary/week1'

/** One word or short phrase to learn. */
export type VocabularyWord = {
  /** The word, in English, as the device's voice will say it. */
  word: string
  /** How it sounds, in phonetic spelling ("/ˈkɒfi/"). May be empty. */
  phonetic: string
  /** A picture of it; `null` shows a drawn stand-in. */
  imageUrl: string | null
  /** What it means in learners' languages, by language tag. A language may be missing. */
  meanings: Record<string, string>
}

/** The words a week teaches (Day 2, "Learn useful words"). */
export type WeekVocabulary = {
  /** In the order they are shown. Never empty. */
  words: VocabularyWord[]
}

/** Vocabulary by week number. */
export type WeekVocabularies = Partial<Record<number, WeekVocabulary>>

export const MAX_VOCABULARY_WORDS = 8
export const MAX_WORD_LENGTH = 40
export const MAX_PHONETIC_LENGTH = 60
export const MAX_MEANING_LENGTH = 60

/** A word's picture is small and square; shown at up to half a phone's width. */
export const WORD_PICTURE_BOUNDS = { maxWidth: 320, maxHeight: 320 }

/** The vocabulary that ships with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekVocabularies: WeekVocabularies = { 1: week1Vocabulary }

function parseWord(value: unknown): VocabularyWord | null {
  if (!isRecord(value)) return null
  const word = tidy(value.word, MAX_WORD_LENGTH)
  if (!word) return null

  const meanings = tidyByLanguage(value.meanings, MAX_MEANING_LENGTH)
  const imageUrl =
    typeof value.imageUrl === 'string' && isSafeAssetUrl(value.imageUrl) ? value.imageUrl : null
  return { word, phonetic: tidy(value.phonetic, MAX_PHONETIC_LENGTH), imageUrl, meanings }
}

/**
 * Vocabulary an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the entries
 * that have a word, and the weeks that have at least one; drops everything else instead of
 * failing.
 */
export const weekVocabulariesSchema = z.unknown().transform((value): WeekVocabularies => {
  if (!isRecord(value)) return {}

  const vocabularies: WeekVocabularies = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const words = (Array.isArray(entry.words) ? entry.words : [])
      .map(parseWord)
      .filter((word) => word !== null)
      .slice(0, MAX_VOCABULARY_WORDS)
    if (words.length > 0) vocabularies[Number(week)] = { words }
  }
  return vocabularies
})

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

/** A week's words, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekVocabulary(week: number): WeekVocabulary | null {
  const overrides = useAppConfig({
    name: WEEK_VOCABULARY_CONFIG_NAME,
    schema: weekVocabulariesSchema,
    defaults: defaultWeekVocabularies,
  })
  return useMemo(() => weekVocabulary(week, overrides), [week, overrides])
}
