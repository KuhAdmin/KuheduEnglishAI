import { describe, expect, it } from 'vitest'
import { turnTiming } from './turnTiming'

const quiet = (elapsedMs: number) =>
  turnTiming({ elapsedMs, voice: { heard: false, quietMs: elapsedMs } })
const spoken = (elapsedMs: number, quietMs: number) =>
  turnTiming({ elapsedMs, voice: { heard: true, quietMs } })

describe('turnTiming', () => {
  it('counts down five seconds for the learner to begin, then shuts the microphone', () => {
    expect(quiet(0)).toEqual({ action: 'none', countdown: { kind: 'start', seconds: 5 } })
    expect(quiet(1200).countdown).toEqual({ kind: 'start', seconds: 4 })
    expect(quiet(4900).countdown).toEqual({ kind: 'start', seconds: 1 })
    expect(quiet(5000)).toEqual({ action: 'shut', countdown: null })
  })

  it('drops the countdown once a voice is heard, and waits while the learner speaks', () => {
    expect(spoken(2000, 0)).toEqual({ action: 'none', countdown: null })
    // Well past the five seconds: they only apply before the learner has begun.
    expect(spoken(30_000, 2900)).toEqual({ action: 'none', countdown: null })
  })

  it('takes a pause of three seconds after speaking as the end of the turn', () => {
    expect(spoken(8000, 3000)).toEqual({ action: 'answer', countdown: null })
  })

  it('counts down the last twenty seconds of a turn, and ends it at two minutes', () => {
    expect(spoken(99_900, 0).countdown).toBeNull()
    expect(spoken(100_000, 0).countdown).toEqual({ kind: 'limit', seconds: 20 })
    expect(spoken(119_100, 0).countdown).toEqual({ kind: 'limit', seconds: 1 })
    expect(spoken(120_000, 0)).toEqual({
      action: 'answer',
      countdown: { kind: 'limit', seconds: 0 },
    })
  })

  it('only watches the length of the turn where the device cannot hear a voice', () => {
    expect(turnTiming({ elapsedMs: 30_000, voice: null })).toEqual({
      action: 'none',
      countdown: null,
    })
    expect(turnTiming({ elapsedMs: 110_000, voice: null }).countdown).toEqual({
      kind: 'limit',
      seconds: 10,
    })
    expect(turnTiming({ elapsedMs: 120_000, voice: null }).action).toBe('answer')
  })
})
