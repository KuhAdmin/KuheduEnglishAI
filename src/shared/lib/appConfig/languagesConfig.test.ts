import { describe, expect, it } from 'vitest'
import { defaultLanguagesConfig, languagesConfigSchema } from './languagesConfig'

describe('languagesConfigSchema', () => {
  it('offers Bengali, Hindi and English by default', () => {
    expect(languagesConfigSchema.parse({})).toEqual(defaultLanguagesConfig)
    expect(defaultLanguagesConfig.languages.map((language) => language.code)).toEqual([
      'bn',
      'hi',
      'en',
    ])
    expect(defaultLanguagesConfig.defaultCode).toBe('bn')
  })

  it('uses the admin list, in the admin order', () => {
    const config = languagesConfigSchema.parse({
      defaultCode: 'ta',
      languages: [
        { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: '/uploads/ta.png' },
        { code: 'en', nativeName: 'English' },
      ],
    })

    expect(config.defaultCode).toBe('ta')
    expect(config.languages).toEqual([
      { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: '/uploads/ta.png' },
      { code: 'en', nativeName: 'English', caption: '', flagUrl: null },
    ])
  })

  it('drops invalid and duplicate entries but keeps the rest', () => {
    const config = languagesConfigSchema.parse({
      languages: [
        { code: 'mr', nativeName: 'मराठी' },
        { code: 'not a code', nativeName: 'Broken' },
        { code: 'gu' },
        'nonsense',
        { code: 'mr', nativeName: 'Duplicate' },
      ],
    })
    expect(config.languages).toEqual([
      { code: 'mr', nativeName: 'मराठी', caption: '', flagUrl: null },
    ])
  })

  it('replaces an unsafe flag URL with no flag', () => {
    const config = languagesConfigSchema.parse({
      languages: [{ code: 'bn', nativeName: 'বাংলা', flagUrl: 'javascript:alert(1)' }],
    })
    expect(config.languages[0]?.flagUrl).toBeNull()
  })

  it.each([[[]], ['bn,hi'], [null], [[{ nativeName: 'No code' }]]])(
    'falls back to the defaults for an unusable list: %j',
    (languages) => {
      expect(languagesConfigSchema.parse({ languages }).languages).toEqual(
        defaultLanguagesConfig.languages,
      )
    },
  )
})
