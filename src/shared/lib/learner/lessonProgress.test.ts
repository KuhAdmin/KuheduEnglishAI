import { beforeEach, describe, expect, it } from 'vitest'
import { isWeekDone, nextLessonDay, useLessonProgressStore } from './lessonProgress'

const state = () => useLessonProgressStore.getState()

beforeEach(() => {
  localStorage.clear()
  useLessonProgressStore.setState({
    heardWeeks: [],
    doneDays: {},
    reviewParts: {},
    scenariosDone: {},
  })
})

describe('nextLessonDay', () => {
  it('is the first day not finished yet', () => {
    expect(nextLessonDay()).toBe(1)
    expect(nextLessonDay([1])).toBe(2)
    expect(nextLessonDay([1, 2])).toBe(3)
    // A day done out of turn does not skip the ones before it.
    expect(nextLessonDay([2])).toBe(1)
    expect(nextLessonDay([1, 3])).toBe(2)
  })

  it('starts the week again once all seven days are done', () => {
    expect(nextLessonDay([1, 2, 3, 4, 5, 6, 7])).toBe(1)
  })
})

describe('isWeekDone', () => {
  it('is true only when every one of the seven days is finished', () => {
    expect(isWeekDone()).toBe(false)
    expect(isWeekDone([1, 2, 3, 4, 5])).toBe(false)
    expect(isWeekDone([1, 2, 3, 4, 5, 7])).toBe(false)
    expect(isWeekDone([7, 6, 5, 4, 3, 2, 1])).toBe(true)
  })
})

describe('useLessonProgressStore', () => {
  it('remembers the scenarios of a week’s challenge taken to the end, each once and in order', () => {
    state().markScenarioDone(1, 2)
    state().markScenarioDone(1, 0)
    state().markScenarioDone(1, 2)
    state().markScenarioDone(4, 1)
    // Not a place in a list of scenarios.
    state().markScenarioDone(4, 3)
    state().markScenarioDone(4, -1)
    state().markScenarioDone(4, 0.5)

    expect(state().scenariosDone).toEqual({ 1: [0, 2], 4: [1] })
    expect(state().doneDays).toEqual({})
  })

  it('remembers the days finished, week by week, each once and in order', () => {
    state().markDayDone(1, 2)
    state().markDayDone(1, 1)
    state().markDayDone(1, 2)
    state().markDayDone(4, 1)

    expect(state().doneDays).toEqual({ 1: [1, 2], 4: [1] })
  })

  it('remembers the weeks whose conversation was heard, each once', () => {
    state().markHeard(3)
    state().markHeard(3)
    expect(state().heardWeeks).toEqual([3])
  })

  it('remembers the parts of a week’s review that were done, each once, in the review’s order', () => {
    state().markReviewPartDone(1, 'roleplay')
    state().markReviewPartDone(1, 'quiz')
    state().markReviewPartDone(1, 'roleplay')
    state().markReviewPartDone(3, 'flashcards')

    expect(state().reviewParts).toEqual({ 1: ['quiz', 'roleplay'], 3: ['flashcards'] })
    // A part of the review done is not a day done.
    expect(state().doneDays).toEqual({})
  })

  it('keeps what it saved across a reload', async () => {
    state().markDayDone(1, 1)
    state().markHeard(1)
    state().markReviewPartDone(1, 'quiz')
    expect(JSON.parse(localStorage.getItem('kuhedu-lessons') ?? '{}').state).toEqual({
      heardWeeks: [1],
      doneDays: { 1: [1] },
      reviewParts: { 1: ['quiz'] },
      scenariosDone: {},
    })

    useLessonProgressStore.setState({ heardWeeks: [], doneDays: {}, reviewParts: {} }, false)
    localStorage.setItem(
      'kuhedu-lessons',
      JSON.stringify({
        state: {
          heardWeeks: [1],
          doneDays: { 1: [1] },
          reviewParts: { 1: ['quiz'] },
          scenariosDone: { 1: [2] },
        },
        version: 0,
      }),
    )
    await useLessonProgressStore.persist.rehydrate()

    expect(state().doneDays).toEqual({ 1: [1] })
    expect(state().heardWeeks).toEqual([1])
    expect(state().reviewParts).toEqual({ 1: ['quiz'] })
    expect(state().scenariosDone).toEqual({ 1: [2] })
  })

  it('reads progress saved before the review existed', async () => {
    localStorage.setItem(
      'kuhedu-lessons',
      JSON.stringify({ state: { heardWeeks: [1], doneDays: { 1: [1, 2] } }, version: 0 }),
    )
    await useLessonProgressStore.persist.rehydrate()

    expect(state().doneDays).toEqual({ 1: [1, 2] })
    expect(state().reviewParts).toEqual({})
    expect(state().scenariosDone).toEqual({})
  })

  it('keeps only real weeks and days from what the browser had saved', async () => {
    localStorage.setItem(
      'kuhedu-lessons',
      JSON.stringify({
        state: {
          heardWeeks: [2, 2, 99, 'x'],
          doneDays: { 1: [2, 1, 1, 9, 'x'], 99: [1], 3: 'nonsense', 4: [] },
          reviewParts: { 1: ['roleplay', 'quiz', 'quiz', 'x', 7], 99: ['quiz'], 3: 'quiz', 4: [] },
          scenariosDone: { 1: [2, 0, 0, 3, -1, 'x', 1.5], 99: [0], 3: 0, 4: [] },
        },
        version: 0,
      }),
    )
    await useLessonProgressStore.persist.rehydrate()

    expect(state().heardWeeks).toEqual([2])
    expect(state().doneDays).toEqual({ 1: [1, 2] })
    expect(state().reviewParts).toEqual({ 1: ['quiz', 'roleplay'] })
    expect(state().scenariosDone).toEqual({ 1: [0, 2] })
  })

  it('starts clean when what was saved is not progress at all', async () => {
    localStorage.setItem(
      'kuhedu-lessons',
      JSON.stringify({
        state: { heardWeeks: 'all', doneDays: [1, 2], reviewParts: ['quiz'], scenariosDone: 3 },
        version: 0,
      }),
    )
    await useLessonProgressStore.persist.rehydrate()

    expect(state().heardWeeks).toEqual([])
    expect(state().doneDays).toEqual({})
    expect(state().reviewParts).toEqual({})
    expect(state().scenariosDone).toEqual({})
  })
})
