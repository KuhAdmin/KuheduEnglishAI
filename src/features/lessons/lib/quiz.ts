import type { QuizQuestion } from '@/shared/lib/curriculum/weekQuizzes'

/**
 * A question's choices in the order to show them. The answer is written apart from the others,
 * so it is given a place among them that differs from question to question and from one showing
 * to the next (`turn` counts the questions shown so far). No chance is involved: the same
 * question on the same turn is always drawn the same way.
 */
export function quizChoices(question: QuizQuestion, turn: number): string[] {
  const slot = (turn + question.answer.length) % (question.others.length + 1)
  return [...question.others.slice(0, slot), question.answer, ...question.others.slice(slot)]
}
