import { beforeEach, describe, expect, it } from 'vitest'
import { hasAnsweredAboutThemselves } from './index'
import { useOnboardingStore } from './store/useOnboardingStore'

beforeEach(() => {
  localStorage.clear()
  useOnboardingStore.setState({ ageGroup: null })
})

describe('hasAnsweredAboutThemselves', () => {
  it('is false until onboarding’s question about the learner is answered', () => {
    expect(hasAnsweredAboutThemselves()).toBe(false)

    useOnboardingStore.getState().setAgeGroup('teen')
    expect(hasAnsweredAboutThemselves()).toBe(true)
  })
})
