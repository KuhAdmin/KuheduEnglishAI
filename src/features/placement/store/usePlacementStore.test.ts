import { beforeEach, describe, expect, it } from 'vitest'
import { ASSESSMENT_VERSION, findItem } from '../data/itemBank'
import { newSession } from '../lib/testSupport'
import { usePlacementStore } from './usePlacementStore'

const STORAGE_KEY = 'kuhedu-placement'

const store = () => usePlacementStore.getState()
const session = () => {
  const current = store().session
  if (!current) throw new Error('no session')
  return current
}
const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').state
const eventNames = () => store().events.map((entry) => entry.event)

/** Answer the current question the way a learner of that ability would. */
function answerCurrent(right: boolean) {
  const item = findItem(session().currentItemId)
  if (!item || item.stage === 'SPEAK') throw new Error('expected a choice question')
  store().submitAnswer({ answer: right ? item.answer : (item.answer + 1) % item.options.length })
}

function finishChoiceStage() {
  const stage = session().stage
  store().beginStage()
  while (session().stage === stage && session().currentItemId) answerCurrent(true)
}

async function reload(state: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: 0 }))
  await usePlacementStore.persist.rehydrate()
}

beforeEach(() => {
  localStorage.clear()
  usePlacementStore.setState({ session: null, result: null, events: [] })
})

describe('usePlacementStore', () => {
  it('starts a session on the first stage’s introduction', () => {
    store().start('bn')

    expect(session()).toMatchObject({
      status: 'IN_PROGRESS',
      version: ASSESSMENT_VERSION,
      languageSupport: 'bn',
      stage: 'LISTEN',
      stageStarted: false,
      currentItemId: null,
      responses: [],
    })
    expect(session().id).toMatch(/^PL-\d{8}-[0-9A-F]{5}$/)
    expect(eventNames()).toEqual(['placement_started'])
  })

  it('saves every answer as it is given', () => {
    store().start('en')
    store().beginStage()
    const first = session().currentItemId
    expect(first).not.toBeNull()

    answerCurrent(true)

    expect(saved().session.responses).toHaveLength(1)
    expect(saved().session.responses[0]).toMatchObject({ itemId: first, correct: true })
    expect(saved().session.currentItemId).toBe(session().currentItemId)
    expect(session().currentItemId).not.toBe(first)
    expect(eventNames()).toEqual([
      'placement_started',
      'placement_item_viewed',
      'placement_answer_submitted',
      'placement_item_completed',
      'placement_item_viewed',
    ])
  })

  it('decides right and wrong itself, and reads nothing into a failed playback', () => {
    store().start('en')
    store().beginStage()
    answerCurrent(false)
    store().submitAnswer({ skipped: 'notSure' })
    store().submitAnswer({ skipped: 'audioFailed' })

    expect(session().responses.map((entry) => entry.correct)).toEqual([false, false, null])
  })

  it('runs through to a result', () => {
    store().start('en')
    finishChoiceStage()
    expect(session().stage).toBe('UNDERSTAND')
    finishChoiceStage()
    expect(session()).toMatchObject({ stage: 'SPEAK', stageStarted: false })
    expect(store().result).toBeNull()

    store().beginStage()
    for (let prompt = 0; prompt < 3; prompt++) {
      store().submitAnswer({ recordingAttempts: 1, recordingDurationMs: 2000 })
    }

    expect(session().status).toBe('COMPLETED')
    expect(store().result?.recommendation.startLevel).toBe('B2+')
    expect(store().result?.sessionId).toBe(session().id)
    expect(saved().result.recommendation.startLevel).toBe('B2+')
    expect(eventNames().filter((name) => name === 'placement_stage_completed')).toHaveLength(3)
    expect(eventNames().at(-1)).toBe('placement_completed')
  })

  it('finishes without speaking when the microphone cannot be used', () => {
    store().start('en')
    finishChoiceStage()
    finishChoiceStage()
    store().skipStage('microphoneDenied')

    expect(session().status).toBe('COMPLETED')
    expect(store().result?.profile.speaking).toEqual({
      status: 'notAssessed',
      reason: 'microphoneDenied',
    })
  })

  it('pauses and resumes without touching the answers', () => {
    store().start('en')
    store().beginStage()
    answerCurrent(true)
    const before = session().currentItemId

    store().pause()
    expect(session().status).toBe('PAUSED')
    expect(saved().session.status).toBe('PAUSED')

    store().resume()
    expect(session()).toMatchObject({ status: 'IN_PROGRESS', currentItemId: before })
    expect(eventNames().at(-1)).toBe('placement_resumed')
    // Resuming a test that is not paused is not an event.
    store().resume()
    expect(eventNames().filter((name) => name === 'placement_resumed')).toHaveLength(1)
  })

  it('records the old test as abandoned when a new one replaces it', () => {
    store().start('en')
    store().beginStage()
    const first = session().id

    store().start('en')

    expect(session().id).not.toBe(first)
    expect(session().responses).toEqual([])
    expect(store().events.find((entry) => entry.event === 'placement_abandoned')?.sessionId).toBe(
      first,
    )
  })

  it('keeps events to what happened — never what was said', () => {
    store().start('en')
    store().beginStage()
    store().track('placement_audio_played')

    for (const entry of store().events) {
      expect(Object.keys(entry).sort()).toEqual([
        'event',
        'itemId',
        'sessionId',
        'stage',
        'timestamp',
      ])
    }
  })
})

describe('saved data', () => {
  it('comes back after a reload', async () => {
    store().start('hi')
    store().beginStage()
    answerCurrent(true)
    const before = session()

    usePlacementStore.setState({ session: null })
    await reload({ session: before, result: null, events: [] })

    expect(session()).toEqual(before)
  })

  it('is ignored when it is not a session at all', async () => {
    await reload({ session: { id: 42, responses: 'lots' }, result: 'great', events: 'none' })
    expect(store()).toMatchObject({ session: null, result: null, events: [] })

    localStorage.setItem(STORAGE_KEY, 'not json')
    await usePlacementStore.persist.rehydrate()
    expect(store().session).toBeNull()
  })

  it('does not continue a test on questions that no longer exist', async () => {
    const mid = { ...newSession(), stageStarted: true }

    await reload({ session: { ...mid, version: 'an-older-bank' }, result: null, events: [] })
    expect(store().session).toBeNull()

    await reload({ session: { ...mid, currentItemId: 'L-GONE' }, result: null, events: [] })
    expect(store().session).toBeNull()

    await reload({ session: { ...mid, currentItemId: 'L-A1-1' }, result: null, events: [] })
    expect(store().session?.currentItemId).toBe('L-A1-1')
  })
})
