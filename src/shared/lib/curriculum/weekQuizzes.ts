import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { isRecord, tidy, tidyList } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Quiz } from './quizzes/week1'
import { parseChallengeText, type ChallengeText } from './weekChallenges'

/** One question with one right answer. */
export type QuizQuestion = {
  /**
   * What is asked. An instruction, not English to practise, so the learner reads it in their own
   * language where it is written in it.
   */
  question: ChallengeText
  /** The right choice, in English. */
  answer: string
  /** The other choices, in English: at least one, none the same as the answer. */
  others: string[]
}

/** The short quiz of a week's review (Day 6): the week's words and expressions, to pick from. */
export type WeekQuiz = {
  /** In the order they are asked. Never empty. */
  questions: QuizQuestion[]
}

/** Quizzes by week number. */
export type WeekQuizzes = Partial<Record<number, WeekQuiz>>

export const MAX_QUIZ_QUESTIONS = 8
/** Besides the answer, so a question has at most four choices: what fits a phone. */
export const MAX_QUIZ_OTHERS = 3
export const MAX_QUIZ_QUESTION_LENGTH = 120
export const MAX_QUIZ_CHOICE_LENGTH = 80

/** The quizzes that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekQuizzes: WeekQuizzes = { 1: week1Quiz }

const comparable = (choice: string) => choice.trim().replace(/\s+/g, ' ').toLowerCase()

/** Two choices a learner could not tell apart. */
export const sameChoice = (a: string, b: string) => comparable(a) === comparable(b)

function parseQuestion(value: unknown): QuizQuestion | null {
  if (!isRecord(value)) return null
  const question = parseChallengeText(value.question, MAX_QUIZ_QUESTION_LENGTH)
  const answer = tidy(value.answer, MAX_QUIZ_CHOICE_LENGTH)
  if (!question.text || !answer) return null

  const others = tidyList(value.others, MAX_QUIZ_CHOICE_LENGTH, Infinity)
    // A choice written twice, or the answer written again, would be a second right answer.
    .filter(
      (choice, index, all) =>
        !sameChoice(choice, answer) &&
        all.findIndex((other) => sameChoice(other, choice)) === index,
    )
    .slice(0, MAX_QUIZ_OTHERS)
  return others.length > 0 ? { question, answer, others } : null
}

/**
 * Quizzes an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the questions
 * that are asked in English and have an answer and another choice, and the weeks that have at
 * least one such question; drops everything else instead of failing.
 */
export const weekQuizzesSchema = z.unknown().transform((value): WeekQuizzes => {
  if (!isRecord(value)) return {}

  const quizzes: WeekQuizzes = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const questions = (Array.isArray(entry.questions) ? entry.questions : [])
      .map(parseQuestion)
      .filter((question) => question !== null)
      .slice(0, MAX_QUIZ_QUESTIONS)
    if (questions.length > 0) quizzes[Number(week)] = { questions }
  }
  return quizzes
})

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
