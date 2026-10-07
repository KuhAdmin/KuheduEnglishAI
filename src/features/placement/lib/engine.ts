import { LEVELS, STAGES, type Confidence, type Level, type Stage } from '../types'
import type { PlacementItem } from './itemSchema'
import type { PlacementResponse, PlacementSession } from './sessionSchema'

/**
 * The adaptive engine: which question comes next, and when a stage has seen enough. Pure
 * functions of the session, so the same answers always lead down the same path.
 * TODO(backend): replace with the server's engine; `advance` is the only entry point screens use.
 */

export const MIN_STAGE_ITEMS = 4
export const MAX_STAGE_ITEMS = 7
export const MAX_SPEAK_PROMPTS = 3
/** This many failed plays in a row means the device cannot play audio. */
export const AUDIO_FAILURE_LIMIT = 2

const TOP = LEVELS.length - 1
const LISTEN_START = LEVELS.indexOf('A1')

/**
 * What one answer shows.
 * - `independent`: right, without help.
 * - `supported`: right, but only after seeing the text or a translation.
 * - `notYet`: wrong, or the learner said they were not sure.
 */
export type Outcome = 'independent' | 'supported' | 'notYet'

export type Evidence = { level: number; outcome: Outcome }

/** `null` when the answer says nothing about the learner (the audio failed, a speaking prompt). */
export function outcomeOf(response: PlacementResponse): Outcome | null {
  if (response.stage === 'SPEAK' || response.skipped === 'audioFailed') return null
  if (!response.correct) return 'notYet'
  // Replaying the audio is not help: listening twice is still listening.
  return response.transcriptShown || response.translationUsed ? 'supported' : 'independent'
}

export function stageEvidence(responses: readonly PlacementResponse[], stage: Stage): Evidence[] {
  return responses.flatMap((response) => {
    const outcome = response.stage === stage ? outcomeOf(response) : null
    return outcome ? [{ level: LEVELS.indexOf(response.level), outcome }] : []
  })
}

const step = (outcome: Outcome) => (outcome === 'independent' ? 1 : outcome === 'notYet' ? -1 : 0)
const clamp = (level: number) => Math.min(TOP, Math.max(0, level))

/** The level to ask at next: up after an unaided right answer, down after a miss. */
export function nextLevel(evidence: readonly Evidence[], startLevel: number): number {
  const last = evidence.at(-1)
  return last ? clamp(last.level + step(last.outcome)) : clamp(startLevel)
}

/** How often the learner's direction turned around: the sign that their level is bracketed. */
function reversals(evidence: readonly Evidence[]): number {
  const moves = evidence.map(({ outcome }) => step(outcome)).filter((move) => move !== 0)
  return moves.filter((move, index) => index > 0 && move !== moves[index - 1]).length
}

export function hasEnoughEvidence(evidence: readonly Evidence[]): boolean {
  if (evidence.length >= MAX_STAGE_ITEMS) return true

  // Twice in a row at the edge of the scale: nothing easier or harder is left to ask.
  const [previous, last] = evidence.slice(-2)
  if (previous && last) {
    const both = (level: number, outcome: Outcome) =>
      [previous, last].every((entry) => entry.level === level && entry.outcome === outcome)
    if (both(0, 'notYet') || both(TOP, 'independent')) return true
  }

  return evidence.length >= MIN_STAGE_ITEMS && reversals(evidence) >= 2
}

export type LevelEstimate = { level: Level; confidence: Confidence }

/**
 * The highest level at which the learner got more right than wrong (help counts as half), or
 * the lowest level if there is none. `null` without any evidence.
 */
export function estimateLevel(evidence: readonly Evidence[]): LevelEstimate | null {
  if (evidence.length === 0) return null

  const at = (level: number) => evidence.filter((entry) => entry.level === level)
  const passes = (level: number) =>
    at(level).reduce(
      (sum, { outcome }) =>
        sum + (outcome === 'independent' ? 1 : outcome === 'supported' ? 0.5 : 0),
      0,
    )
  const misses = (level: number) => at(level).filter(({ outcome }) => outcome === 'notYet').length

  const reached = LEVELS.map((_, level) => level)
    .filter((level) => passes(level) > misses(level))
    .at(-1)
  const level = reached ?? 0

  const seenHere = at(level).length
  const cappedAbove = level === TOP || misses(level + 1) > 0
  const confidence: Confidence =
    seenHere >= 2 && cappedAbove ? 'high' : seenHere >= 2 || cappedAbove ? 'medium' : 'low'

  return { level: LEVELS[level] ?? 'FOUNDATION', confidence }
}

/** Where a stage starts: gently for listening, then just below what listening showed. */
export function startLevelFor(stage: Stage, responses: readonly PlacementResponse[]): number {
  if (stage !== 'UNDERSTAND') return LISTEN_START
  const listening = estimateLevel(stageEvidence(responses, 'LISTEN'))
  return listening ? clamp(LEVELS.indexOf(listening.level) - 1) : LISTEN_START
}

/** A stable number from a string (FNV-1a), so "random" choices repeat for the same session. */
function hash(text: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

function pickChoiceItem(
  session: PlacementSession,
  bank: readonly PlacementItem[],
): PlacementItem | null {
  const { stage, responses } = session
  const mine = responses.filter((response) => response.stage === stage)

  const recentFailures = mine.slice(-AUDIO_FAILURE_LIMIT)
  if (
    recentFailures.length === AUDIO_FAILURE_LIMIT &&
    recentFailures.every((response) => response.skipped === 'audioFailed')
  ) {
    return null
  }

  const evidence = stageEvidence(responses, stage)
  if (hasEnoughEvidence(evidence)) return null

  const used = new Set(responses.map((response) => response.itemId))
  const unused = bank.filter((item) => item.stage === stage && !used.has(item.id))
  if (unused.length === 0) return null

  // The wanted level if any question is left there, else the nearest one (easier first).
  const target = nextLevel(evidence, startLevelFor(stage, responses))
  const distance = (item: PlacementItem) => Math.abs(LEVELS.indexOf(item.level) - target)
  const nearest = Math.min(...unused.map(distance))
  const lowest = Math.min(
    ...unused
      .filter((item) => distance(item) === nearest)
      .map((item) => LEVELS.indexOf(item.level)),
  )
  let candidates = unused.filter((item) => LEVELS.indexOf(item.level) === lowest)

  // Spread Understand questions over vocabulary, meaning, grammar and replies.
  if (stage === 'UNDERSTAND') {
    const typeOf = (id: string) => {
      const item = bank.find((entry) => entry.id === id)
      return item?.stage === 'UNDERSTAND' ? item.type : undefined
    }
    const asked = mine.map((response) => typeOf(response.itemId))
    const timesAsked = (item: PlacementItem) =>
      asked.filter((type) => item.stage === 'UNDERSTAND' && type === item.type).length
    const fewest = Math.min(...candidates.map(timesAsked))
    candidates = candidates.filter((item) => timesAsked(item) === fewest)
  }

  return candidates[hash(`${session.id}:${stage}:${mine.length}`) % candidates.length] ?? null
}

function pickSpeakItem(
  session: PlacementSession,
  bank: readonly PlacementItem[],
): PlacementItem | null {
  const mine = session.responses.filter((response) => response.stage === 'SPEAK')
  // A learner who cannot answer one prompt is not pushed on to a harder one.
  if (mine.length >= MAX_SPEAK_PROMPTS || mine.at(-1)?.skipped) return null

  const used = new Set(mine.map((response) => response.itemId))
  return (
    bank
      .filter((item) => item.stage === 'SPEAK' && !used.has(item.id))
      .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))[0] ?? null
  )
}

/** The next question of the current stage, or `null` when the stage is over. */
export function pickNextItem(
  session: PlacementSession,
  bank: readonly PlacementItem[],
): PlacementItem | null {
  if (session.notAssessed[session.stage]) return null
  return session.stage === 'SPEAK' ? pickSpeakItem(session, bank) : pickChoiceItem(session, bank)
}

/**
 * Move the session to whatever comes next: the stage's first or next question, the next
 * stage's introduction, or completion. Call it after every answer, stage start or stage skip.
 */
export function advance(
  session: PlacementSession,
  bank: readonly PlacementItem[],
  now: string,
): PlacementSession {
  let next: PlacementSession = { ...session, updatedAt: now }

  for (;;) {
    const skipped = next.notAssessed[next.stage]
    if (!skipped && !next.stageStarted) return { ...next, currentItemId: null }

    const item = skipped ? null : pickNextItem(next, bank)
    if (item) return { ...next, currentItemId: item.id }

    // The stage is over. Listening that only ever failed to play was not assessed at all.
    if (
      next.stage === 'LISTEN' &&
      !next.notAssessed.LISTEN &&
      stageEvidence(next.responses, 'LISTEN').length === 0
    ) {
      next = { ...next, notAssessed: { ...next.notAssessed, LISTEN: 'audioUnavailable' } }
    }

    const following = STAGES[STAGES.indexOf(next.stage) + 1]
    if (!following) {
      return { ...next, status: 'COMPLETED', completedAt: now, currentItemId: null }
    }
    next = { ...next, stage: following, stageStarted: false, currentItemId: null }
  }
}
