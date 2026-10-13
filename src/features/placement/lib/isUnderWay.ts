import type { PlacementSession } from './sessionSchema'

/**
 * A test the learner has actually begun: its first stage was started, or something was answered.
 * Worth offering back, and worth opening the app on. One that was only opened is neither.
 */
export const isUnderWay = (session: PlacementSession | null) =>
  session !== null &&
  session.status !== 'COMPLETED' &&
  (session.stageStarted || session.responses.length > 0)
