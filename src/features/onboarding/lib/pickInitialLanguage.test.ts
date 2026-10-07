import { describe, expect, it } from 'vitest'
import { defaultLanguagesConfig } from '@/shared/lib/appConfig/languagesConfig'
import { pickInitialLanguage } from './pickInitialLanguage'

const { languages } = defaultLanguagesConfig
const base = { languages, saved: null, deviceLanguages: [], defaultCode: 'bn' }

describe('pickInitialLanguage', () => {
  it("prefers the learner's earlier choice", () => {
    expect(pickInitialLanguage({ ...base, saved: 'en', deviceLanguages: ['hi-IN'] })).toBe('en')
  })

  it('ignores an earlier choice that is no longer offered', () => {
    expect(pickInitialLanguage({ ...base, saved: 'ta' })).toBe('bn')
  })

  it('matches a mother tongue set on the device', () => {
    expect(pickInitialLanguage({ ...base, deviceLanguages: ['en-IN', 'hi-IN'] })).toBe('hi')
  })

  it('does not treat an English device as a wish for English only', () => {
    expect(pickInitialLanguage({ ...base, deviceLanguages: ['en-US', 'en'] })).toBe('bn')
  })

  it("falls back to the admin's default, then to the first language", () => {
    expect(pickInitialLanguage({ ...base, defaultCode: 'hi' })).toBe('hi')
    expect(pickInitialLanguage({ ...base, defaultCode: 'ta' })).toBe('bn')
  })

  it('returns null when no languages are offered', () => {
    expect(pickInitialLanguage({ ...base, languages: [] })).toBeNull()
  })
})
