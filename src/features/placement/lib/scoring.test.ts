import { describe, expect, it } from 'vitest'
import { itemBank } from '../data/itemBank'
import { buildResult } from './scoring'
import { resultSchema } from './sessionSchema'
import { learnerAt, newSession, play, type Answerer } from './testSupport'

const resultFor = (answer: Answerer, session = newSession()) =>
  buildResult(play(session, answer), itemBank)

describe('buildResult', () => {
  it('places a steady A2 learner at A2 with little support, and says speaking is unscored', () => {
    const result = resultFor(learnerAt('A2'))

    expect(resultSchema.safeParse(result).success).toBe(true)
    expect(result.profile.listening).toEqual({
      status: 'assessed',
      level: 'A2',
      confidence: 'high',
    })
    expect(result.profile.understanding).toMatchObject({ status: 'assessed', level: 'A2' })
    expect(result.profile.speaking).toEqual({ status: 'notAssessed', reason: 'notScoredYet' })
    expect(result.profile.speakingAttempts).toBe(3)
    expect(result.recommendation).toEqual({
      startLevel: 'A2',
      supportLevel: 'LOW',
      prioritySkills: ['speaking'],
      provisional: true,
    })
  })

  it('starts a learner who was unsure of everything at the foundation, with full support', () => {
    const result = resultFor((item) =>
      item.stage === 'SPEAK'
        ? { skipped: 'declined', recordingAttempts: 0 }
        : { correct: false, skipped: 'notSure', helpOpened: true },
    )

    expect(result.recommendation.startLevel).toBe('FOUNDATION')
    expect(result.recommendation.supportLevel).toBe('HIGH')
    expect(result.profile.speakingAttempts).toBe(0)
    expect(result.profile.dependency.help).toBe(1)
  })

  it('starts at the weaker skill and makes it the priority', () => {
    const result = resultFor((item) =>
      item.stage === 'LISTEN' ? learnerAt('A1')(item) : learnerAt('B1')(item),
    )

    expect(result.profile.listening).toMatchObject({ level: 'A1' })
    expect(result.profile.understanding).toMatchObject({ level: 'B1' })
    expect(result.recommendation.startLevel).toBe('A1')
    expect(result.recommendation.prioritySkills).toEqual(['listening', 'speaking'])
  })

  it('reads heavy use of translation as a need for more support, not as failure', () => {
    const result = resultFor((item) => ({
      correct: true,
      helpOpened: true,
      translationOffered: true,
      translationUsed: item.stage !== 'SPEAK',
    }))

    expect(result.profile.dependency.translation).toBe(1)
    expect(result.recommendation.supportLevel).toBe('HIGH')
    // Helped answers still count: the learner is not sent back to the start.
    expect(result.recommendation.startLevel).not.toBe('FOUNDATION')
  })

  it('counts replays as support needed, without lowering the level', () => {
    const result = resultFor((item) => ({ ...learnerAt('A2')(item), playCount: 3 }))

    expect(result.profile.dependency.replay).toBe(1)
    expect(result.profile.dependency.translation).toBeNull()
    expect(result.recommendation).toMatchObject({ startLevel: 'A2', supportLevel: 'MEDIUM' })
  })

  it('leaves listening unassessed when the device could not play audio', () => {
    const result = resultFor((item) =>
      item.stage === 'LISTEN' ? { correct: null, skipped: 'audioFailed' } : learnerAt('A2')(item),
    )

    expect(result.profile.listening).toEqual({
      status: 'notAssessed',
      reason: 'audioUnavailable',
    })
    expect(result.recommendation.startLevel).toBe('A2')
    expect(result.profile.dependency.replay).toBeNull()
  })

  it('keeps the reason speaking was not attempted', () => {
    const session = { ...newSession(), notAssessed: { SPEAK: 'microphoneDenied' as const } }
    const result = resultFor(learnerAt('A1'), session)

    expect(result.profile.speaking).toEqual({ status: 'notAssessed', reason: 'microphoneDenied' })
    expect(result.profile.speakingAttempts).toBe(0)
  })

  it('tallies the kinds of Understand question', () => {
    const { understandBreakdown } = resultFor(learnerAt('B2+')).profile
    const attempted = Object.values(understandBreakdown).reduce(
      (sum, tally) => sum + tally.attempted,
      0,
    )
    // A learner at the top of the scale is done after two right answers there.
    expect(attempted).toBeGreaterThanOrEqual(3)
    for (const tally of Object.values(understandBreakdown)) {
      expect(tally.correct).toBe(tally.attempted)
    }
  })
})
