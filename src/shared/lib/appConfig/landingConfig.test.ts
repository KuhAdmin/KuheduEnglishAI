import { describe, expect, it } from 'vitest'
import { defaultLandingConfig, landingConfigSchema } from './landingConfig'

describe('landingConfigSchema', () => {
  it('fills every field with a default for an empty payload', () => {
    expect(landingConfigSchema.parse({})).toEqual(defaultLandingConfig)
    expect(defaultLandingConfig.brand.logoUrl).toBe('/logo.svg')
    expect(defaultLandingConfig.hero.imageUrl).toBeNull()
    expect(defaultLandingConfig.cta.primaryLabel).toBe('Get Started')
  })

  it('has a default headline in Bengali, Hindi and English, in that order', () => {
    const { headlines } = defaultLandingConfig.overlay
    expect(headlines.map((headline) => headline.lang)).toEqual(['bn', 'hi', 'en'])
    for (const headline of headlines) expect(headline.text.trim()).not.toBe('')
  })

  it('merges a partial payload over the defaults', () => {
    const config = landingConfigSchema.parse({
      brand: { name: 'Acme English' },
      hero: { imageUrl: 'https://cdn.example.com/hero.webp', focalPoint: 'center' },
      overlay: { headlines: [{ lang: 'en', text: 'Speak with confidence' }] },
    })

    expect(config.brand).toEqual({ ...defaultLandingConfig.brand, name: 'Acme English' })
    expect(config.hero.imageUrl).toBe('https://cdn.example.com/hero.webp')
    expect(config.hero.focalPoint).toBe('center')
    expect(config.overlay.headlines).toEqual([
      { lang: 'en', text: 'Speak with confidence', subtext: '' },
    ])
    expect(config.cta).toEqual(defaultLandingConfig.cta)
  })

  it('keeps valid headlines in order and drops unusable ones', () => {
    const config = landingConfigSchema.parse({
      overlay: {
        headlines: [
          { lang: 'ta', text: 'தமிழ்', subtext: 'துணை' },
          { lang: 'not a lang', text: 'x' },
          { lang: 'en', text: '   ' },
          'nonsense',
          { lang: 'en', text: 'English' },
        ],
      },
    })
    expect(config.overlay.headlines).toEqual([
      { lang: 'ta', text: 'தமிழ்', subtext: 'துணை' },
      { lang: 'en', text: 'English', subtext: '' },
    ])
  })

  it('never shows more than eight headlines, and falls back when none are usable', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ lang: 'en', text: `H${index}` }))
    expect(
      landingConfigSchema.parse({ overlay: { headlines: many } }).overlay.headlines,
    ).toHaveLength(8)
    expect(landingConfigSchema.parse({ overlay: { headlines: [] } }).overlay).toEqual(
      defaultLandingConfig.overlay,
    )
  })

  it('carries over a headline saved in the earlier single-headline format', () => {
    const config = landingConfigSchema.parse({
      overlay: { headline: 'Speak with confidence', headlineLang: 'en', subheadline: 'Daily' },
    })
    expect(config.overlay.headlines).toEqual([
      { lang: 'en', text: 'Speak with confidence', subtext: 'Daily' },
    ])
  })

  it.each([
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    '//evil.example/x.png',
    'http://x.io/a.png',
  ])('replaces the unsafe URL %s with the default', (url) => {
    const config = landingConfigSchema.parse({ brand: { logoUrl: url }, hero: { imageUrl: url } })
    expect(config.brand.logoUrl).toBe('/logo.svg')
    expect(config.hero.imageUrl).toBeNull()
  })

  it('accepts root-relative asset paths', () => {
    const config = landingConfigSchema.parse({ brand: { logoUrl: '/uploads/logo.png' } })
    expect(config.brand.logoUrl).toBe('/uploads/logo.png')
  })

  it('falls back field by field when values are invalid', () => {
    const config = landingConfigSchema.parse({
      overlay: { headline: '   ', headlineLang: 'not a lang' },
      cta: { primaryLabel: 42 },
    })
    expect(config.overlay).toEqual(defaultLandingConfig.overlay)
    expect(config.cta.primaryLabel).toBe('Get Started')
  })

  it('rejects a payload that is not an object', () => {
    expect(landingConfigSchema.safeParse(null).success).toBe(false)
  })
})
