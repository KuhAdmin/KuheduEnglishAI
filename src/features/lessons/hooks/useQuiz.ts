import { useState } from 'react'
import type { QuizQuestion } from '@/shared/lib/curriculum/weekQuizzes'
import { quizChoices } from '../lib/quiz'

const inOrder = (questions: readonly QuizQuestion[]) => questions.map((_, index) => index)

/**
 * One run through a quiz: a question at a time, each answered by picking a choice and checking
 * it. A question answered wrong comes back once, after the others — the revision the review is
 * for — and is not asked a third time. What counts in the end is how many were right the first
 * time.
 */
export function useQuiz(questions: readonly QuizQuestion[]) {
  // Positions of the questions still to answer, the one on screen first.
  const [queue, setQueue] = useState(() => inOrder(questions))
  const [missed, setMissed] = useState<readonly number[]>([])
  const [picked, setPicked] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)
  // Questions shown so far, over every run: a new one moves focus and redraws the choices.
  const [turn, setTurn] = useState(0)

  const index = queue[0]
  // An admin may shorten the quiz while it is open; a question that went is not asked.
  const question = index === undefined ? undefined : questions[index]
  const again = index !== undefined && missed.includes(index)
  const right = checked && question !== undefined && picked === question.answer

  const clear = () => {
    setPicked(null)
    setChecked(false)
    setTurn((before) => before + 1)
  }

  return {
    /** The question on screen; `undefined` once the quiz is over. */
    question,
    choices: question ? quizChoices(question, turn) : [],
    turn,
    /** This question was answered wrong before and is being asked once more. */
    again,
    /** Its place among the questions, from 1, while it is asked for the first time. */
    place: questions.length - queue.filter((other) => !missed.includes(other)).length + 1,
    total: questions.length,
    picked,
    checked,
    right,
    rightFirstTime: questions.length - missed.length,

    pick(choice: string) {
      if (!checked) setPicked(choice)
    },

    /** Settles the question on screen; says whether the choice was the right one. */
    check(): boolean {
      if (picked === null || question === undefined) return false
      setChecked(true)
      return picked === question.answer
    },

    next() {
      if (index === undefined) return
      const comesBack = !right && !again
      if (comesBack) setMissed([...missed, index])
      setQueue([...queue.slice(1), ...(comesBack ? [index] : [])])
      clear()
    },

    restart() {
      setQueue(inOrder(questions))
      setMissed([])
      clear()
    },
  }
}
