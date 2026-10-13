import { parseByWeek, parseWeekQuiz, type WeekQuiz } from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { week1Quiz } from './quizzes/week1'

// What a quiz is, how long it may be and how one is read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
export {
  MAX_QUIZ_CHOICE_LENGTH,
  MAX_QUIZ_OTHERS,
  MAX_QUIZ_QUESTION_LENGTH,
  MAX_QUIZ_QUESTIONS,
  sameChoice,
  type QuizQuestion,
  type WeekQuiz,
} from '@kuhedu/contracts'

/** Quizzes by week number. */
export type WeekQuizzes = Partial<Record<number, WeekQuiz>>

/** The quizzes that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekQuizzes: WeekQuizzes = { 1: week1Quiz }

/**
 * Quizzes an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the questions
 * that are asked in English and have an answer and another choice, and the weeks that have at
 * least one such question; drops everything else instead of failing.
 */
export const weekQuizzesSchema = z
  .unknown()
  .transform((value): WeekQuizzes => parseByWeek(value, parseWeekQuiz))

export const defaultWeekQuizzes: WeekQuizzes = {}

export const WEEK_QUIZZES_CONFIG_NAME = 'week-quizzes'

/** A week's quiz: the admin's if they wrote one, else the built-in one, else none. */
export function weekQuiz(week: number, overrides: WeekQuizzes = {}): WeekQuiz | null {
  return overrides[week] ?? builtInWeekQuizzes[week] ?? null
}

/** A week's quiz, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekQuiz(week: number): WeekQuiz | null {
  const overrides = useAppConfig({
    name: WEEK_QUIZZES_CONFIG_NAME,
    schema: weekQuizzesSchema,
    defaults: defaultWeekQuizzes,
  })
  return useMemo(() => weekQuiz(week, overrides), [week, overrides])
}
