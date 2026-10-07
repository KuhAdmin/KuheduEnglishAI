import { ASSESSMENT_VERSION, findItem, itemBank } from '../data/itemBank'
import { LEVELS, type Level } from '../types'
import { advance } from './engine'
import type { PlacementItem } from './itemSchema'
import type { PlacementResponse, PlacementSession } from './sessionSchema'

/** Helpers for tests: build sessions and play simulated learners through the engine. */

export const NOW = '2026-10-07T10:00:00.000Z'

export function newSession(id = 'PL-20261007-TEST1'): PlacementSession {
  return {
    id,
    version: ASSESSMENT_VERSION,
    status: 'IN_PROGRESS',
    startedAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    languageSupport: 'bn',
    deviceType: 'mobile',
    stage: 'LISTEN',
    stageStarted: false,
    currentItemId: null,
    responses: [],
    notAssessed: {},
  }
}

export function response(
  item: PlacementItem,
  overrides: Partial<PlacementResponse> = {},
): PlacementResponse {
  return {
    itemId: item.id,
    stage: item.stage,
    level: item.level,
    answeredAt: NOW,
    timeTakenMs: 4000,
    answer: null,
    correct: item.stage === 'SPEAK' ? null : true,
    skipped: null,
    playCount: item.stage === 'LISTEN' ? 1 : 0,
    slowPlayCount: 0,
    helpOpened: false,
    transcriptShown: false,
    translationOffered: false,
    translationUsed: false,
    modelPlayed: false,
    recordingAttempts: item.stage === 'SPEAK' ? 1 : 0,
    recordingDurationMs: item.stage === 'SPEAK' ? 2500 : 0,
    ...overrides,
  }
}

/** How a simulated learner answers a question. */
export type Answerer = (item: PlacementItem) => Partial<PlacementResponse>

/** A learner who gets everything up to `ability` right and nothing above it. */
export const learnerAt =
  (ability: Level): Answerer =>
  (item) => ({ correct: LEVELS.indexOf(item.level) <= LEVELS.indexOf(ability) })

/** Play a learner through the rest of the test; returns the finished session. */
export function play(session: PlacementSession, answer: Answerer): PlacementSession {
  let current = session
  for (let guard = 0; guard < 100 && current.status !== 'COMPLETED'; guard++) {
    if (!current.stageStarted) {
      current = advance({ ...current, stageStarted: true }, itemBank, NOW)
      continue
    }
    const item = findItem(current.currentItemId)
    if (!item) throw new Error('A started stage must have a current question')
    current = advance(
      { ...current, responses: [...current.responses, response(item, answer(item))] },
      itemBank,
      NOW,
    )
  }
  return current
}

export const askedIn = (session: PlacementSession, stage: PlacementSession['stage']) =>
  session.responses.filter((entry) => entry.stage === stage)
