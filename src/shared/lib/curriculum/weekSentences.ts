import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { DEFAULT_LANGUAGE, primarySubtag } from '../i18n'
import { byLanguage, isRecord, tidy, tidyByLanguage, tidyList } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Sentences } from './sentences/week1'

/** One sentence to put into English and then say. */
export type PracticeSentence = {
  /** The sentence in English: the answer, shown once the learner has tried or asked for it. */
  english: string
  /** Other English sentences that are just as right ("Hi! Good morning."). May be empty. */
  alsoAccepted: string[]
  /** The sentence in learners' languages, by language tag: what they translate from. */
  translations: Record<string, string>
  /** Short tips for getting to the English, by language tag. English is what others fall back to. */
  tips: Record<string, string[]>
}

/** The sentences a week practises (Day 3, "Translate and speak"). */
export type WeekSentences = {
  /** In the order they are shown, one at a time. Never empty. */
  sentences: PracticeSentence[]
}

/** Sentences by week number. */
export type WeekSentencesByWeek = Partial<Record<number, WeekSentences>>

export const MAX_SENTENCES = 6
export const MAX_ALSO_ACCEPTED = 4
export const MAX_TIPS = 3
export const MAX_SENTENCE_LENGTH = 120
export const MAX_SENTENCE_TRANSLATION_LENGTH = 200
export const MAX_TIP_LENGTH = 160

/** The sentences that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekSentences: WeekSentencesByWeek = { 1: week1Sentences }

function parseSentence(value: unknown): PracticeSentence | null {
  if (!isRecord(value)) return null
  const english = tidy(value.english, MAX_SENTENCE_LENGTH)
  if (!english) return null

  return {
    english,
    alsoAccepted: tidyList(value.alsoAccepted, MAX_SENTENCE_LENGTH, MAX_ALSO_ACCEPTED),
    translations: tidyByLanguage(value.translations, MAX_SENTENCE_TRANSLATION_LENGTH),
    tips: byLanguage(value.tips, (entry) => {
      const tips = tidyList(entry, MAX_TIP_LENGTH, MAX_TIPS)
      return tips.length > 0 ? tips : null
    }),
  }
}

/**
 * Sentences an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the entries
 * that have an English sentence, and the weeks that have at least one; drops everything else
 * instead of failing.
 */
export const weekSentencesSchema = z.unknown().transform((value): WeekSentencesByWeek => {
  if (!isRecord(value)) return {}

  const byWeek: WeekSentencesByWeek = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const sentences = (Array.isArray(entry.sentences) ? entry.sentences : [])
      .map(parseSentence)
      .filter((sentence) => sentence !== null)
      .slice(0, MAX_SENTENCES)
    if (sentences.length > 0) byWeek[Number(week)] = { sentences }
  }
  return byWeek
})

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
export function sentenceTips(
  sentence: PracticeSentence,
  language: string,
): { lang: string; tips: string[] } {
  for (const lang of [language, primarySubtag(language)]) {
    const tips = sentence.tips[lang]
    if (tips) return { lang, tips }
  }
  return { lang: DEFAULT_LANGUAGE, tips: sentence.tips[DEFAULT_LANGUAGE] ?? [] }
}

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
