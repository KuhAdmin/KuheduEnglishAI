import { describe, expect, it } from 'vitest'
import { translationKeys } from '@/shared/lib/i18n'
import { fitWithin } from './imageUpload'
import { groupOfText, groupTextKeys } from './textGroups'
import { validateDialogue } from './validateDialogue'
import { validateLanguages } from './validateLanguages'

describe('text groups', () => {
  it('files texts under the screen they appear on', () => {
    expect(groupOfText('onboarding.language.title')).toBe('language')
    expect(groupOfText('ageGroup.child')).toBe('profile')
    expect(groupOfText('onboarding.placement.start')).toBe('placement')
    expect(groupOfText('onboarding.continue')).toBe('onboarding')
    expect(groupOfText('auth.title')).toBe('signIn')
    expect(groupOfText('something.new')).toBe('other')
  })

  it('shows every text exactly once', () => {
    const grouped = groupTextKeys().flatMap((group) => group.keys)
    expect([...grouped].sort()).toEqual([...translationKeys].sort())
  })

  it('has a home for every current text, so "Other" stays empty', () => {
    expect(groupTextKeys().some((group) => group.id === 'other')).toBe(false)
  })
})

describe('validateLanguages', () => {
  const bengali = { code: 'bn', nativeName: 'বাংলা', caption: 'Bengali', flagUrl: null }

  it('accepts a normal list', () => {
    const result = validateLanguages([
      bengali,
      { ...bengali, code: 'en-IN', nativeName: 'English' },
    ])
    expect(result.valid).toBe(true)
    expect(result.rows).toEqual([{}, {}])
  })

  it('points at the row and field to fix', () => {
    const result = validateLanguages([
      bengali,
      { ...bengali, nativeName: '  ' },
      { ...bengali, code: 'Not A Code', nativeName: 'X' },
    ])
    expect(result.valid).toBe(false)
    expect(result.rows[0]).toEqual({})
    expect(result.rows[1]).toEqual({
      code: 'This code is already used by another language.',
      nativeName: 'Enter the language name.',
    })
    expect(result.rows[2]).toEqual({ code: 'Use a short code such as bn or en-IN.' })
  })

  it('needs at least one language and at most the maximum', () => {
    expect(validateLanguages([]).list).toBe('Keep at least one language.')
    const many = Array.from({ length: 31 }, (_, index) => ({
      ...bengali,
      code: `x${String.fromCharCode(97 + (index % 26))}${index > 25 ? 'a' : ''}`,
    }))
    expect(validateLanguages(many).list).toBe('That is the maximum number of languages.')
  })
})

describe('fitWithin', () => {
  it('shrinks to fit while keeping the proportions', () => {
    expect(fitWithin(4000, 2000, { maxWidth: 1000, maxHeight: 1000 })).toEqual({
      width: 1000,
      height: 500,
    })
    expect(fitWithin(1000, 4000, { maxWidth: 1080, maxHeight: 1920 })).toEqual({
      width: 480,
      height: 1920,
    })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(64, 48, { maxWidth: 256, maxHeight: 256 })).toEqual({ width: 64, height: 48 })
  })
})

describe('validateDialogue', () => {
  const line = { speaker: 'Asha', text: 'Hello!', translations: {} }

  it('accepts a conversation, with or without a video link', () => {
    expect(validateDialogue({ videoUrl: null, lines: [line] }).valid).toBe(true)
    expect(
      validateDialogue({ videoUrl: 'https://cdn.example.com/week1.mp4', lines: [line] }).valid,
    ).toBe(true)
    // No conversation at all is nothing to fix.
    expect(validateDialogue({ videoUrl: null, lines: [] }).valid).toBe(true)
  })

  it('points at the line that is unfinished', () => {
    const result = validateDialogue({
      videoUrl: null,
      lines: [line, { speaker: ' ', text: '', translations: {} }],
    })
    expect(result.valid).toBe(false)
    expect(result.lines).toEqual([
      {},
      { speaker: 'Enter who says this.', text: 'Enter what they say.' },
    ])
  })

  it('refuses a video link that is not https, and a video without its conversation', () => {
    for (const videoUrl of [
      'http://example.com/a.mp4',
      'javascript:alert(1)',
      'data:video/mp4;base64,AAAA',
    ]) {
      expect(validateDialogue({ videoUrl, lines: [line] })).toMatchObject({
        valid: false,
        video: 'Use a link that starts with https://',
      })
    }
    expect(validateDialogue({ videoUrl: 'https://example.com/a.mp4', lines: [] })).toMatchObject({
      valid: false,
      list: 'Add the conversation the video shows: at least one line.',
    })
  })

  it('refuses more lines than a conversation may have', () => {
    const lines = Array.from({ length: 17 }, () => line)
    expect(validateDialogue({ videoUrl: null, lines }).list).toBe(
      'That is the maximum number of lines.',
    )
  })
})
