import { beforeEach, describe, expect, it } from 'vitest'
import { placementProgress, type PlacementResult } from './index'
import { usePlacementStore } from './store/usePlacementStore'

beforeEach(() => {
  localStorage.clear()
  usePlacementStore.setState({ session: null, result: null, events: [] })
})

describe('placementProgress', () => {
  it('is nothing before the test is opened', () => {
    expect(placementProgress()).toBe('none')
  })

  it('is still nothing for a test that was opened and not begun', () => {
    usePlacementStore.getState().start('bn')
    expect(placementProgress()).toBe('none')
  })

  it('is started once its first stage has been begun, and stays so while the app is away', () => {
    usePlacementStore.getState().start('bn')
    usePlacementStore.getState().beginStage()
    expect(placementProgress()).toBe('started')

    // Leaving the app pauses the test; it is still the one to come back to.
    usePlacementStore.getState().pause()
    expect(usePlacementStore.getState().session?.status).toBe('PAUSED')
    expect(placementProgress()).toBe('started')
  })

  it('is done once there is an outcome, whatever became of the session since', () => {
    // The outcome's contents are not looked at: that there is one is the whole answer.
    usePlacementStore.setState({ result: {} as PlacementResult })
    expect(placementProgress()).toBe('done')

    // Taking the test again does not put the learner back at the start.
    usePlacementStore.getState().start('bn')
    expect(placementProgress()).toBe('done')
  })
})
