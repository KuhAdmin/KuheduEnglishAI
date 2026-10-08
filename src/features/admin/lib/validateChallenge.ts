import {
  MAX_CHALLENGE_TASKS,
  type ChallengeText,
  type WeekChallenge,
} from '@/shared/lib/curriculum/weekChallenges'
import { adminText } from '../adminText'

export type ChallengeTaskErrors = { text?: string }

export type ChallengeValidation = {
  /** Problem with the challenge's name. */
  title?: string
  /** One entry per task, in order; empty object when the task is fine. */
  tasks: ChallengeTaskErrors[]
  /** Problem with the tasks as a whole. */
  list?: string
  valid: boolean
}

const isBlank = (value: ChallengeText) =>
  !value.text.trim() && Object.keys(value.translations).length === 0

/** A week with no challenge at all: nothing to check, and nothing to store. */
export const isEmptyChallenge = (challenge: WeekChallenge) =>
  challenge.tasks.length === 0 &&
  challenge.phrases.length === 0 &&
  isBlank(challenge.title) &&
  isBlank(challenge.instruction)

/**
 * Checks a week's challenge before it is saved. The settings schema would silently drop a task
 * without its English, and a whole challenge without a name or without tasks; an admin should
 * instead be told what to fix. English is required because it is what every language falls
 * back to.
 */
export function validateChallenge(challenge: WeekChallenge): ChallengeValidation {
  const text = adminText.lessons
  const empty = isEmptyChallenge(challenge)

  const title = !empty && !challenge.title.text.trim() ? text.errorChallengeTitle : undefined
  const tasks = challenge.tasks.map((task): ChallengeTaskErrors =>
    task.text.trim() ? {} : { text: text.errorTask },
  )
  const list =
    challenge.tasks.length > MAX_CHALLENGE_TASKS
      ? text.errorTooManyTasks
      : !empty && challenge.tasks.length === 0
        ? text.errorNoTasks
        : undefined

  return {
    title,
    tasks,
    list,
    valid: !title && !list && tasks.every((entry) => Object.keys(entry).length === 0),
  }
}
