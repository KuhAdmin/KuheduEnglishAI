import { describe, expect, it } from 'vitest'
import { findItem, itemBank } from '../data/itemBank'
import { LEVELS, UNDERSTAND_TYPES, type Level, type Stage } from '../types'
import {
  advance,
  estimateLevel,
  hasEnoughEvidence,
  MAX_SPEAK_PROMPTS,
  MAX_STAGE_ITEMS,
  MIN_STAGE_ITEMS,
  nextLevel,
  outcomeOf,
  stageEvidence,
  type Evidence,
  type Outcome,
} from './engine'
import { itemSchema } from './itemSchema'
import { askedIn, learnerAt, newSession, NOW, play, response } from './testSupport'

const level = (name: Level) => LEVELS.indexOf(name)
const evidence = (...entries: (readonly [Level, Outcome])[]): Evidence[] =>
  entries.map(([name, outcome]) => ({ level: level(name), outcome }))

const listenItem = itemBank.find((item) => item.stage === 'LISTEN')
const speakItem = itemBank.find((item) => item.stage === 'SPEAK')
if (!listenItem || !speakItem) throw new Error('the bank needs listening and speaking questions')

describe('question bank', () => {
  it('holds only valid questions with unique ids', () => {
    for (const item of itemBank) expect(itemSchema.safeParse(item).success, item.id).toBe(true)
    expect(new Set(itemBank.map((item) => item.id)).size).toBe(itemBank.length)
  })

  it('has enough questions at every level to run each stage', () => {
    for (const name of LEVELS) {
      const at = (stage: Stage) =>
        itemBank.filter((item) => item.stage === stage && item.level === name)
      expect(at('LISTEN').length, `listening at ${name}`).toBeGreaterThanOrEqual(4)
      const understand = at('UNDERSTAND')
      for (const type of UNDERSTAND_TYPES) {
        expect(
          understand.some((item) => item.stage === 'UNDERSTAND' && item.type === type),
          `${type} at ${name}`,
        ).toBe(true)
      }
    }
    expect(itemBank.filter((item) => item.stage === 'SPEAK').length).toBeGreaterThanOrEqual(
      MAX_SPEAK_PROMPTS,
    )
  })

  it('offers help texts in Bengali and Hindi together, never just one', () => {
    for (const item of itemBank) {
      if (item.translations) expect(Object.keys(item.translations).sort()).toEqual(['bn', 'hi'])
    }
  })
})

describe('outcomeOf', () => {
  it('separates unaided, helped and missed answers', () => {
    expect(outcomeOf(response(listenItem, { correct: true }))).toBe('independent')
    expect(outcomeOf(response(listenItem, { correct: true, translationUsed: true }))).toBe(
      'supported',
    )
    expect(outcomeOf(response(listenItem, { correct: true, transcriptShown: true }))).toBe(
      'supported',
    )
    expect(outcomeOf(response(listenItem, { correct: false }))).toBe('notYet')
    expect(outcomeOf(response(listenItem, { correct: false, skipped: 'notSure' }))).toBe('notYet')
  })

  it('does not hold replays against the learner', () => {
    expect(outcomeOf(response(listenItem, { correct: true, playCount: 4, slowPlayCount: 2 }))).toBe(
      'independent',
    )
  })

  it('reads nothing into a failed playback or an unscored recording', () => {
    expect(outcomeOf(response(listenItem, { correct: null, skipped: 'audioFailed' }))).toBeNull()
    expect(outcomeOf(response(speakItem))).toBeNull()
  })
})

describe('nextLevel', () => {
  it('starts where it is told and then follows the answers', () => {
    expect(nextLevel([], level('A1'))).toBe(level('A1'))
    expect(nextLevel(evidence(['A1', 'independent']), level('A1'))).toBe(level('A2'))
    expect(nextLevel(evidence(['A2', 'supported']), level('A1'))).toBe(level('A2'))
    expect(nextLevel(evidence(['A2', 'notYet']), level('A1'))).toBe(level('A1'))
  })

  it('stays on the scale', () => {
    expect(nextLevel(evidence(['FOUNDATION', 'notYet']), 0)).toBe(0)
    expect(nextLevel(evidence(['B2+', 'independent']), 0)).toBe(level('B2+'))
  })
})

describe('hasEnoughEvidence', () => {
  it('needs a minimum of answers and two changes of direction', () => {
    const bracketed = evidence(
      ['A1', 'independent'],
      ['A2', 'independent'],
      ['B1', 'notYet'],
      ['A2', 'independent'],
    )
    expect(bracketed).toHaveLength(MIN_STAGE_ITEMS)
    expect(hasEnoughEvidence(bracketed)).toBe(true)
    expect(hasEnoughEvidence(bracketed.slice(0, 3))).toBe(false)

    // One change of direction is not yet a bracket.
    expect(
      hasEnoughEvidence(
        evidence(['A1', 'independent'], ['A2', 'independent'], ['B1', 'notYet'], ['A2', 'notYet']),
      ),
    ).toBe(false)
  })

  it('stops early at either end of the scale', () => {
    expect(
      hasEnoughEvidence(
        evidence(['A1', 'notYet'], ['FOUNDATION', 'notYet'], ['FOUNDATION', 'notYet']),
      ),
    ).toBe(true)
    expect(hasEnoughEvidence(evidence(['B2+', 'independent'], ['B2+', 'independent']))).toBe(true)
    expect(hasEnoughEvidence(evidence(['A1', 'notYet'], ['FOUNDATION', 'notYet']))).toBe(false)
  })

  it('never asks more than the maximum', () => {
    const helped = Array.from({ length: MAX_STAGE_ITEMS }, () => ['A1', 'supported'] as const)
    expect(hasEnoughEvidence(evidence(...helped))).toBe(true)
    expect(hasEnoughEvidence(evidence(...helped.slice(1)))).toBe(false)
  })
})

describe('estimateLevel', () => {
  it('is the highest level with more right than wrong', () => {
    expect(
      estimateLevel(
        evidence(
          ['A1', 'independent'],
          ['A2', 'independent'],
          ['B1', 'notYet'],
          ['A2', 'independent'],
        ),
      ),
    ).toEqual({ level: 'A2', confidence: 'high' })
  })

  it('does not credit a level on an even split', () => {
    expect(
      estimateLevel(evidence(['A1', 'independent'], ['A2', 'independent'], ['A2', 'notYet']))
        ?.level,
    ).toBe('A1')
  })

  it('counts a helped answer as half', () => {
    expect(estimateLevel(evidence(['A2', 'supported'], ['A2', 'notYet']))?.level).toBe('FOUNDATION')
    expect(estimateLevel(evidence(['A2', 'supported'], ['A2', 'supported']))?.level).toBe('A2')
  })

  it('falls back to the lowest level, and to nothing without evidence', () => {
    expect(estimateLevel(evidence(['A1', 'notYet'], ['FOUNDATION', 'notYet']))?.level).toBe(
      'FOUNDATION',
    )
    expect(estimateLevel([])).toBeNull()
  })
})

describe('a whole test', () => {
  it('walks a learner through all three stages and completes', () => {
    const finished = play(newSession(), learnerAt('A2'))

    expect(finished.status).toBe('COMPLETED')
    expect(finished.completedAt).toBe(NOW)
    expect(finished.currentItemId).toBeNull()
    for (const stage of ['LISTEN', 'UNDERSTAND'] as const) {
      const count = askedIn(finished, stage).length
      expect(count).toBeGreaterThanOrEqual(MIN_STAGE_ITEMS)
      expect(count).toBeLessThanOrEqual(MAX_STAGE_ITEMS)
      expect(estimateLevel(stageEvidence(finished.responses, stage))?.level).toBe('A2')
    }
    expect(askedIn(finished, 'SPEAK').map((entry) => entry.itemId)).toEqual(['S-1', 'S-2', 'S-3'])
  })

  it.each(LEVELS)('places a steady %s learner at %s without repeating a question', (ability) => {
    const finished = play(newSession(), learnerAt(ability))
    const asked = finished.responses.map((entry) => entry.itemId)

    expect(new Set(asked).size).toBe(asked.length)
    expect(estimateLevel(stageEvidence(finished.responses, 'LISTEN'))?.level).toBe(ability)
    expect(estimateLevel(stageEvidence(finished.responses, 'UNDERSTAND'))?.level).toBe(ability)
  })

  it('takes the same path for the same session and answers', () => {
    const path = (id: string) =>
      play(newSession(id), learnerAt('B1')).responses.map((entry) => entry.itemId)
    expect(path('PL-20261007-AAAAA')).toEqual(path('PL-20261007-AAAAA'))
  })

  it('starts Understand just below what listening showed', () => {
    const afterListening = play(newSession(), (item) =>
      item.stage === 'LISTEN' ? learnerAt('B1')(item) : { correct: false },
    )
    expect(askedIn(afterListening, 'UNDERSTAND')[0]?.level).toBe('A2')
  })

  it('spreads Understand questions over the different kinds', () => {
    const finished = play(newSession(), learnerAt('A2'))
    const kinds = askedIn(finished, 'UNDERSTAND').map((entry) => {
      const item = findItem(entry.itemId)
      return item?.stage === 'UNDERSTAND' ? item.type : undefined
    })
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(3)
  })

  it('does not push a learner past a speaking prompt they could not answer', () => {
    const finished = play(newSession(), (item) =>
      item.id === 'S-2' ? { skipped: 'declined', recordingAttempts: 0 } : learnerAt('A1')(item),
    )
    expect(askedIn(finished, 'SPEAK').map((entry) => entry.itemId)).toEqual(['S-1', 'S-2'])
    expect(finished.status).toBe('COMPLETED')
  })

  it('gives up on listening after two failed plays in a row, without judging the learner', () => {
    const finished = play(newSession(), (item) =>
      item.stage === 'LISTEN' ? { correct: null, skipped: 'audioFailed' } : learnerAt('A1')(item),
    )
    expect(askedIn(finished, 'LISTEN')).toHaveLength(2)
    expect(finished.notAssessed.LISTEN).toBe('audioUnavailable')
    // With nothing known from listening, Understand starts at the gentle default.
    expect(askedIn(finished, 'UNDERSTAND')[0]?.level).toBe('A1')
  })

  it('moves on when a stage is skipped, and finishes when the last one is', () => {
    const started = advance({ ...newSession(), stageStarted: true }, itemBank, NOW)
    expect(started.currentItemId).not.toBeNull()

    const atSpeak = { ...newSession(), stage: 'SPEAK' as const }
    const skipped = advance(
      { ...atSpeak, notAssessed: { SPEAK: 'microphoneDenied' } },
      itemBank,
      NOW,
    )
    expect(skipped.status).toBe('COMPLETED')
  })

  it('shows each stage’s introduction before its first question', () => {
    const fresh = advance(newSession(), itemBank, NOW)
    expect(fresh).toMatchObject({ stage: 'LISTEN', stageStarted: false, currentItemId: null })
  })
})
