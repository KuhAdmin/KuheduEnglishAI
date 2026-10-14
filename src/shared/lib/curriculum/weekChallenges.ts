import {
  parseByWeek,
  parseWeekChallenge,
  type ChallengeText,
  type WeekChallenge,
} from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { DEFAULT_LANGUAGE, primarySubtag } from '../i18n'
import { week1Challenge } from './challenges/week1'

// What a challenge is, how long it may be and how one is read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
// TODO(backend): send the recording to be assessed, in place of the learner's own ticks.
export {
  MAX_CHALLENGE_INSTRUCTION_LENGTH,
  MAX_CHALLENGE_PHRASE_LENGTH,
  MAX_CHALLENGE_PHRASES,
  MAX_CHALLENGE_TASK_LENGTH,
  MAX_CHALLENGE_TASKS,
  MAX_CHALLENGE_TITLE_LENGTH,
  parseChallengeText,
  translationLength,
  type ChallengeText,
  type WeekChallenge,
} from '@kuhedu/contracts'

/** Challenges by week number. */
export type WeekChallenges = Partial<Record<number, WeekChallenge>>

/**
 * The longest a learner's one take may be; it is held in memory until the screen goes. Five
 * minutes, because Week 48's challenge is to speak for that long.
 */
export const MAX_CHALLENGE_TAKE_MS = 300_000

/** The challenges that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekChallenges: WeekChallenges = { 1: week1Challenge }

/**
 * Challenges an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the tasks
 * that are written in English, and the weeks that have a name and at least one such task; drops
 * everything else instead of failing.
 */
export const weekChallengesSchema = z
  .unknown()
  .transform((value): WeekChallenges => parseByWeek(value, parseWeekChallenge))

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
