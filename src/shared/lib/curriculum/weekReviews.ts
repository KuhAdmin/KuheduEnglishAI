import { useMemo } from 'react'
import { useAppConfig } from '../appConfig/useAppConfig'
import { week1ReviewDialogue, week1ReviewRoleplay } from './reviews/week1'
import type { WeekChallenge } from './weekChallenges'
import { weekDialoguesSchema, type WeekDialogue, type WeekDialogues } from './weekDialogues'
import type { WeekQuiz } from './weekQuizzes'
import { weekRoleplaysSchema, type WeekRoleplay, type WeekRoleplays } from './weekRoleplays'
import type { WeekVocabulary } from './weekVocabulary'

/** What a week's review (Day 6) offers, in the order it is listed. */
export const REVIEW_PARTS = ['quiz', 'listening', 'speaking', 'flashcards', 'roleplay'] as const
export type ReviewPart = (typeof REVIEW_PARTS)[number]

export const isReviewPart = (value: unknown): value is ReviewPart =>
  REVIEW_PARTS.some((part) => part === value)

/**
 * A week's review, part by part; `null` where the week has nothing for a part, which is then
 * left off the list. Three parts have content of their own: the quiz (`weekQuizzes.ts`), a
 * second conversation to listen to and a second role-play. The other two repeat the week:
 * speaking is Day 5's challenge again, the flashcards are Day 2's words.
 */
export type WeekReview = {
  quiz: WeekQuiz | null
  listening: WeekDialogue | null
  speaking: WeekChallenge | null
  flashcards: WeekVocabulary | null
  roleplay: WeekRoleplay | null
}

/** The parts a week's review has something for. */
export const reviewPartsOf = (review: WeekReview): ReviewPart[] =>
  REVIEW_PARTS.filter((part) => review[part] !== null)

/** The review conversations that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInReviewDialogues: WeekDialogues = { 1: week1ReviewDialogue }

/** The review role-plays that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInReviewRoleplays: WeekRoleplays = { 1: week1ReviewRoleplay }

// What an admin wrote for these two is stored like Day 1's conversations and Day 4's
// role-plays, and read back by the same schemas: only the name of the settings object differs.
export const reviewDialoguesSchema = weekDialoguesSchema
export const reviewRoleplaysSchema = weekRoleplaysSchema

export const defaultReviewDialogues: WeekDialogues = {}
export const defaultReviewRoleplays: WeekRoleplays = {}

export const WEEK_REVIEW_DIALOGUES_CONFIG_NAME = 'week-review-dialogues'
export const WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME = 'week-review-roleplays'

/** A week's review conversation: the admin's if they wrote one, else the built-in one, else none. */
export function reviewDialogue(week: number, overrides: WeekDialogues = {}): WeekDialogue | null {
  return overrides[week] ?? builtInReviewDialogues[week] ?? null
}

/** A week's review role-play: the admin's if they wrote one, else the built-in one, else none. */
export function reviewRoleplay(week: number, overrides: WeekRoleplays = {}): WeekRoleplay | null {
  return overrides[week] ?? builtInReviewRoleplays[week] ?? null
}

/** A week's review conversation, or `null` when it has none yet; follows an admin's edits live. */
export function useReviewDialogue(week: number): WeekDialogue | null {
  const overrides = useAppConfig({
    name: WEEK_REVIEW_DIALOGUES_CONFIG_NAME,
    schema: reviewDialoguesSchema,
    defaults: defaultReviewDialogues,
  })
  return useMemo(() => reviewDialogue(week, overrides), [week, overrides])
}

/** A week's review role-play, or `null` when it has none yet; follows an admin's edits live. */
export function useReviewRoleplay(week: number): WeekRoleplay | null {
  const overrides = useAppConfig({
    name: WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME,
    schema: reviewRoleplaysSchema,
    defaults: defaultReviewRoleplays,
  })
  return useMemo(() => reviewRoleplay(week, overrides), [week, overrides])
}
