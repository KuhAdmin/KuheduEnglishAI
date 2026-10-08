import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { DEFAULT_LANGUAGE, primarySubtag } from '../i18n'
import { isRecord, tidy, tidyByLanguage, tidyList } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Challenge } from './challenges/week1'

/**
 * Something the learner is told, not something to practise: written in English and, where an
 * admin did so, in learners' languages by language tag.
 */
export type ChallengeText = {
  text: string
  translations: Record<string, string>
}

/**
 * The week's task done from start to finish in one go (Day 5): the learner reads what to do,
 * records themselves doing all of it, then listens back and ticks what they managed.
 * TODO(backend): send the recording to be assessed, in place of the learner's own ticks.
 */
export type WeekChallenge = {
  /** Its name, e.g. "Café challenge". */
  title: ChallengeText
  /** One sentence under the name; its text may be empty. */
  instruction: ChallengeText
  /** What to do, in the order to do it. Never empty. */
  tasks: ChallengeText[]
  /** Help the learner can ask for: English phrases that fit the task. May be empty. */
  phrases: string[]
}

/** Challenges by week number. */
export type WeekChallenges = Partial<Record<number, WeekChallenge>>

export const MAX_CHALLENGE_TASKS = 6
export const MAX_CHALLENGE_PHRASES = 6
export const MAX_CHALLENGE_TITLE_LENGTH = 40
export const MAX_CHALLENGE_INSTRUCTION_LENGTH = 120
export const MAX_CHALLENGE_TASK_LENGTH = 80
export const MAX_CHALLENGE_PHRASE_LENGTH = 120
/** A translation may run longer than its English. */
export const translationLength = (max: number) => Math.round(max * 1.5)

/** The longest a learner's one take may be; it is held in memory until the screen goes. */
export const MAX_CHALLENGE_TAKE_MS = 120_000

/** The challenges that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekChallenges: WeekChallenges = { 1: week1Challenge }

/** Reads one such text back from settings storage, where anything may have been put. */
export function parseChallengeText(value: unknown, max: number): ChallengeText {
  const given = isRecord(value) ? value : {}
  return {
    text: tidy(given.text, max),
    translations: tidyByLanguage(given.translations, translationLength(max)),
  }
}

/**
 * Challenges an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the tasks
 * that are written in English, and the weeks that have a name and at least one such task; drops
 * everything else instead of failing.
 */
export const weekChallengesSchema = z.unknown().transform((value): WeekChallenges => {
  if (!isRecord(value)) return {}

  const challenges: WeekChallenges = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const title = parseChallengeText(entry.title, MAX_CHALLENGE_TITLE_LENGTH)
    const tasks = (Array.isArray(entry.tasks) ? entry.tasks : [])
      .map((task) => parseChallengeText(task, MAX_CHALLENGE_TASK_LENGTH))
      .filter((task) => task.text !== '')
      .slice(0, MAX_CHALLENGE_TASKS)
    if (!title.text || tasks.length === 0) continue

    challenges[Number(week)] = {
      title,
      instruction: parseChallengeText(entry.instruction, MAX_CHALLENGE_INSTRUCTION_LENGTH),
      tasks,
      phrases: tidyList(entry.phrases, MAX_CHALLENGE_PHRASE_LENGTH, MAX_CHALLENGE_PHRASES),
    }
  }
  return challenges
})

export const defaultWeekChallenges: WeekChallenges = {}

export const WEEK_CHALLENGES_CONFIG_NAME = 'week-challenges'

/** A week's challenge: the admin's if they wrote one, else the built-in one, else none. */
export function weekChallenge(week: number, overrides: WeekChallenges = {}): WeekChallenge | null {
  return overrides[week] ?? builtInWeekChallenges[week] ?? null
}

/**
 * A text of a challenge for a learner: in their language if it is written in it (`bn-IN` falls
 * back to `bn`), else in English. `lang` is the language it is in, for the element showing it.
 */
export function challengeText(
  value: ChallengeText,
  language: string,
): { lang: string; text: string } {
  for (const lang of [language, primarySubtag(language)]) {
    const text = value.translations[lang]
    if (text) return { lang, text }
  }
  return { lang: DEFAULT_LANGUAGE, text: value.text }
}

/** A week's challenge, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekChallenge(week: number): WeekChallenge | null {
  const overrides = useAppConfig({
    name: WEEK_CHALLENGES_CONFIG_NAME,
    schema: weekChallengesSchema,
    defaults: defaultWeekChallenges,
  })
  return useMemo(() => weekChallenge(week, overrides), [week, overrides])
}
