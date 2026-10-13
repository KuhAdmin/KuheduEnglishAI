import type { LearnerData } from '@kuhedu/contracts'

/**
 * One kind of thing a learner has in this browser that is also kept with their account: their
 * settings, their progress, their placement test. Each knows its own store and its own rule for
 * bringing the two together; `learnerSync` only says when.
 */
export type LearnerPart = {
  name: string
  /**
   * Bring what is here and what the account holds together, without sending anything. When
   * `adopting`, what is here was nobody's until now (a visitor's choices, or what the app kept
   * before accounts did), so it fills whatever the account lacks. Otherwise the account's is the
   * truth, save for changes made here that it has not been sent yet.
   */
  settle: (account: LearnerData, how: { adopting: boolean }) => void | Promise<void>
  /** Send what the account has not got yet. Throws when it could not be sent, to be tried again. */
  send: () => Promise<void>
  /** Call back whenever something here changes. Answers with how to stop. */
  watch: (changed: () => void) => () => void
  /** Back to nothing: this browser is nobody's. */
  clear: () => void
}

const parts: LearnerPart[] = []

/**
 * Take part in being kept with the account. Called by whoever owns a store, from the store's own
 * side, so that `shared/` never has to import a feature to reach its store.
 */
export function registerLearnerPart(part: LearnerPart) {
  if (!parts.some((other) => other.name === part.name)) parts.push(part)
}

export const learnerParts = (): readonly LearnerPart[] => parts
