import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { settingsRepository } from '../appConfig/settingsRepository'
import { AppLanguageProvider } from './AppLanguageProvider'
import { bn } from './bn'
import { en, translationKeys } from './en'
import { hi } from './hi'
import { useLanguage, useT } from './I18nContext'
import { I18nProvider } from './I18nProvider'
import { SCREEN_TEXTS_CONFIG_NAME, screenTextsSchema } from './screenTexts'
import { isEnglish, translate } from './translate'
import { useLanguageStore } from './useLanguageStore'

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
})

describe('built-in catalogs', () => {
  it.each([
    ['bn', bn],
    ['hi', hi],
  ])('%s has a real text for every key', (_code, catalog) => {
    for (const key of translationKeys) {
      expect(catalog[key]?.trim(), key).toBeTruthy()
    }
    expect(Object.keys(catalog).sort()).toEqual([...translationKeys].sort())
  })

  it('bn and hi are actually translated, not copies of English', () => {
    const same = (catalog: typeof bn) =>
      translationKeys.filter((key) => catalog[key] === en[key] && key !== 'app.name')
    // Hindi keeps Western digits, so its age ranges match English; nothing else may.
    expect(same(bn)).toEqual([])
    expect(same(hi)).toEqual(['ageGroup.childRange', 'ageGroup.teenRange', 'ageGroup.adultRange'])
  })
})

describe('translate', () => {
  it('returns the built-in text for the language', () => {
    expect(translate('en', 'onboarding.continue')).toBe('Continue')
    expect(translate('bn', 'onboarding.continue')).toBe('এগিয়ে যান')
    expect(translate('hi', 'onboarding.continue')).toBe('आगे बढ़ें')
  })

  it('falls back from a regional code to its base language', () => {
    expect(translate('bn-IN', 'onboarding.continue')).toBe('এগিয়ে যান')
  })

  it('shows English for a language that has no texts yet', () => {
    expect(translate('ta', 'onboarding.continue')).toBe('Continue')
  })

  it('prefers the admin’s text, then built-in, then the admin’s English, then English', () => {
    const adminTexts = {
      bn: { 'home.title': 'অ্যাডমিনের লেখা' },
      en: { 'home.title': 'Admin English', 'home.subtitle': 'Admin English subtitle' },
      ta: { 'home.title': 'நிர்வாகி உரை' },
    } as const

    expect(translate('bn', 'home.title', adminTexts)).toBe('অ্যাডমিনের লেখা')
    // No admin Bengali subtitle → built-in Bengali wins over admin English.
    expect(translate('bn', 'home.subtitle', adminTexts)).toBe(bn['home.subtitle'])
    expect(translate('ta', 'home.title', adminTexts)).toBe('நிர்வாகி உரை')
    // Tamil has no subtitle anywhere → admin English.
    expect(translate('ta', 'home.subtitle', adminTexts)).toBe('Admin English subtitle')
    expect(translate('ta', 'lessons.title', adminTexts)).toBe(en['lessons.title'])
  })
})

describe('isEnglish', () => {
  it('recognises English and its regional codes', () => {
    expect(isEnglish('en')).toBe(true)
    expect(isEnglish('en-IN')).toBe(true)
    expect(isEnglish('bn')).toBe(false)
  })
})

describe('screenTextsSchema', () => {
  it('keeps known keys with text and drops everything else', () => {
    expect(
      screenTextsSchema.parse({
        bn: { 'home.title': '  নতুন  ', 'not.a.key': 'x', 'home.subtitle': '   ', 'nav.home': 5 },
        'not a language': { 'home.title': 'x' },
        hi: {},
        ta: 'nonsense',
      }),
    ).toEqual({ bn: { 'home.title': 'নতুন' } })
  })

  it.each([null, 'text', 5, []])('turns %j into no texts', (value) => {
    expect(screenTextsSchema.parse(value)).toEqual({})
  })

  it('drops texts that are too long', () => {
    expect(screenTextsSchema.parse({ en: { 'home.title': 'x'.repeat(301) } })).toEqual({})
  })
})

function Probe() {
  const t = useT()
  return (
    <p>
      {useLanguage()}: {t('onboarding.continue')}
    </p>
  )
}

describe('useT', () => {
  it('uses English outside any provider', () => {
    render(<Probe />)
    expect(screen.getByText('en: Continue')).toBeInTheDocument()
  })

  it('follows the nearest provider, so part of a screen can use another language', () => {
    render(
      <I18nProvider language="bn">
        <Probe />
        <I18nProvider language="hi">
          <Probe />
        </I18nProvider>
      </I18nProvider>,
    )
    expect(screen.getByText('bn: এগিয়ে যান')).toBeInTheDocument()
    expect(screen.getByText('hi: आगे बढ़ें')).toBeInTheDocument()
  })

  it('shows an admin’s edit as soon as it is saved', () => {
    render(
      <I18nProvider language="bn">
        <Probe />
      </I18nProvider>,
    )

    act(() =>
      settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, {
        bn: { 'onboarding.continue': 'পরবর্তী' },
      }),
    )
    expect(screen.getByText('bn: পরবর্তী')).toBeInTheDocument()
  })
})

describe('AppLanguageProvider', () => {
  it('uses English until the learner has chosen, then their language', () => {
    render(
      <AppLanguageProvider>
        <Probe />
      </AppLanguageProvider>,
    )
    expect(screen.getByText('en: Continue')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')

    act(() => useLanguageStore.getState().setLanguage('hi'))
    expect(screen.getByText('hi: आगे बढ़ें')).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('hi')
  })

  it('remembers the choice on this device', () => {
    useLanguageStore.getState().setLanguage('bn')
    expect(JSON.parse(localStorage.getItem('kuhedu-language') ?? '{}').state.language).toBe('bn')
  })
})
