import {
  MAX_QUIZ_QUESTIONS,
  sameChoice,
  type QuizQuestion,
  type WeekQuiz,
} from '@/shared/lib/curriculum/weekQuizzes'
import { adminText } from '../adminText'

export type QuizQuestionErrors = { question?: string; answer?: string; others?: string }

export type QuizValidation = {
  /** One entry per question, in order; empty object when the question is fine. */
  questions: QuizQuestionErrors[]
  /** Problem with the quiz as a whole. */
  list?: string
  valid: boolean
}

function othersError(question: QuizQuestion): string | undefined {
  const text = adminText.lessons
  // A line left blank while typing is not a choice.
  const others = question.others.filter((choice) => choice.trim())
  if (others.length === 0) return text.errorQuizOthers

  const repeated = others.some(
    (choice, index) =>
      sameChoice(choice, question.answer) ||
      others.findIndex((other) => sameChoice(other, choice)) !== index,
  )
  return repeated ? text.errorQuizSameChoice : undefined
}

/**
 * Checks a week's quiz before it is saved. The settings schema would silently drop a question
 * without its English, its answer or another choice, and a choice that repeats another — which
 * could leave a question with nothing wrong to pick; an admin should instead be told what to fix.
 */
export function validateQuiz(quiz: WeekQuiz): QuizValidation {
  const text = adminText.lessons

  const questions = quiz.questions.map((question): QuizQuestionErrors => {
    const errors: QuizQuestionErrors = {}
    if (!question.question.text.trim()) errors.question = text.errorQuestion
    if (!question.answer.trim()) errors.answer = text.errorQuizAnswer
    const others = othersError(question)
    if (others) errors.others = others
    return errors
  })
  const list = quiz.questions.length > MAX_QUIZ_QUESTIONS ? text.errorTooManyQuestions : undefined

  return {
    questions,
    list,
    valid: !list && questions.every((entry) => Object.keys(entry).length === 0),
  }
}
