import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { PROFILES_CONFIG_NAME } from '@/shared/lib/appConfig/profilesConfig'
import { parseSettings, settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { SCREEN_TEXTS_CONFIG_NAME } from '@/shared/lib/i18n/screenTexts'
import type * as ImageUpload from '../lib/imageUpload'
import { LandingSettingsPage } from './LandingSettingsPage'
import { LanguagesSettingsPage } from './LanguagesSettingsPage'
import { ProfilesSettingsPage } from './ProfilesSettingsPage'
import { ScreenTextsPage } from './ScreenTextsPage'

// jsdom has no canvas; the resize step itself is covered by fitWithin's tests and by Playwright.
vi.mock('../lib/imageUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageUpload>()),
  fileToStoredImage: vi.fn(async () => 'data:image/webp;base64,UklGRg=='),
}))

const stored = (name: string) =>
  parseSettings(settingsRepository.readRaw(name), {
    safeParse: (value: unknown) => ({ success: true as const, data: value as never }),
  }) as Record<string, never> | undefined

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
const pngFile = () => new File(['x'], 'picture.png', { type: 'image/png' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('ScreenTextsPage', () => {
  it('lists every text in English first, with nothing to save yet', () => {
    render(<ScreenTextsPage />)

    expect(screen.getByRole('radio', { name: /^English/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^বাংলা/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Choose your language' })).toHaveValue(
      'Choose your language',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('saves an edited Bengali text and keeps only what changed', async () => {
    render(<ScreenTextsPage />)
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা/ }))

    // The label is the English source; the value is the current Bengali text.
    const field = screen.getByRole('textbox', { name: 'Choose your language' })
    expect(field).toHaveValue('আপনার ভাষা বেছে নিন')
    expect(field).toHaveAttribute('lang', 'bn')

    await userEvent.clear(field)
    await userEvent.type(field, 'ভাষা নির্বাচন করুন')
    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
    await save()

    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      bn: { 'onboarding.language.title': 'ভাষা নির্বাচন করুন' },
    })
    expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('resets one text back to the built-in wording', async () => {
    settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, { en: { 'home.title': 'Hello there' } })
    render(<ScreenTextsPage />)

    expect(screen.getByRole('textbox', { name: 'Ready to speak?' })).toHaveValue('Hello there')
    await userEvent.click(screen.getByRole('button', { name: 'Reset this text: Ready to speak?' }))
    expect(screen.getByRole('textbox', { name: 'Ready to speak?' })).toHaveValue('Ready to speak?')
    await save()

    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({})
  })

  it('finds texts by searching', async () => {
    render(<ScreenTextsPage />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), 'placement')

    expect(screen.getByRole('textbox', { name: 'Start Placement Test' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Choose your language' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), ' zzz')
    expect(screen.getByText('No texts match your search.')).toBeVisible()
  })

  it('shows only the chosen screen’s texts, together with the language and the search', async () => {
    render(<ScreenTextsPage />)
    const screenPicker = screen.getByRole('combobox', { name: 'Screen' })
    expect(screenPicker).toHaveValue('all')

    await userEvent.selectOptions(screenPicker, 'Sign in and sign up')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in and sign up' })).toBeVisible()
    expect(screen.getByText(/replaced by the brand name/)).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Language' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Choose your language' })).not.toBeInTheDocument()

    // The search narrows within that screen …
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), 'guest')
    expect(screen.getByRole('textbox', { name: 'Continue as Guest' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Create Account' })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search texts' }))

    // … and the language choice still applies.
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা/ }))
    const field = screen.getByRole('textbox', { name: 'Create Account' })
    expect(field).toHaveValue('অ্যাকাউন্ট তৈরি করুন')
    await userEvent.clear(field)
    await userEvent.type(field, 'নতুন অ্যাকাউন্ট')
    await save()
    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      bn: { 'auth.signUpSubmit': 'নতুন অ্যাকাউন্ট' },
    })

    await userEvent.selectOptions(screenPicker, 'All screens')
    expect(screen.getByRole('textbox', { name: 'Choose your language' })).toBeInTheDocument()
  })

  it('offers languages the admin added and marks their texts as missing', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [{ code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null }],
    })
    render(<ScreenTextsPage />)

    const tamil = screen.getByRole('radio', { name: /^தமிழ் 0\// })
    await userEvent.click(tamil)
    expect(screen.getByRole('textbox', { name: 'Continue' })).toHaveValue('')
    expect(screen.getAllByText('Missing — shows English').length).toBeGreaterThan(10)
  })
})

describe('LandingSettingsPage', () => {
  it('saves edited wording and an uploaded logo', async () => {
    render(<LandingSettingsPage />)

    // One headline per language: Bengali, Hindi and English by default.
    expect(screen.getByRole('combobox', { name: 'Language of headline 1' })).toHaveValue('bn')
    expect(screen.getByRole('combobox', { name: 'Language of headline 3' })).toHaveValue('en')
    const headline = screen.getByRole('textbox', { name: 'Headline 3' })
    await userEvent.clear(headline)
    await userEvent.type(headline, 'Speak with confidence')
    await userEvent.upload(screen.getByLabelText('Logo'), pngFile())
    await screen.findByRole('button', { name: 'Use default' })
    await save()

    const landing = stored(LANDING_CONFIG_NAME) as unknown as {
      brand: { logoUrl: string; name: string }
      overlay: { headlines: { lang: string; text: string }[] }
    }
    expect(landing.overlay.headlines).toHaveLength(3)
    expect(landing.overlay.headlines[2]).toMatchObject({
      lang: 'en',
      text: 'Speak with confidence',
    })
    expect(landing.brand.logoUrl).toBe('data:image/webp;base64,UklGRg==')
    expect(landing.brand.name).toBe('Kuhedu English')
  })

  it('adds, reorders and removes headlines', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [
        { code: 'bn', nativeName: 'বাংলা' },
        { code: 'hi', nativeName: 'हिन्दी' },
        { code: 'ta', nativeName: 'தமிழ்' },
      ],
    })
    render(<LandingSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add headline' }))
    // The new row suggests a language without a headline yet, and must be filled in.
    expect(screen.getByRole('combobox', { name: 'Language of headline 4' })).toHaveValue('ta')
    expect(screen.getByText('Enter the headline text.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Headline 4' }), 'தமிழ் தலைப்பு')
    await userEvent.click(screen.getByRole('button', { name: 'Move up: headline 4' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 1' }))
    await save()

    const landing = stored(LANDING_CONFIG_NAME) as unknown as {
      overlay: { headlines: { lang: string; text: string }[] }
    }
    expect(landing.overlay.headlines.map((item) => item.lang)).toEqual(['hi', 'ta', 'en'])
    expect(landing.overlay.headlines[1]?.text).toBe('தமிழ் தலைப்பு')
  })

  it('keeps at least one headline', async () => {
    render(<LandingSettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 2' }))
    expect(screen.getByRole('button', { name: 'Remove headline 1' })).toBeDisabled()
  })

  it('discards unsaved edits', async () => {
    render(<LandingSettingsPage />)

    const name = screen.getByRole('textbox', { name: 'Brand name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Something else')
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Kuhedu English')
    expect(stored(LANDING_CONFIG_NAME)).toBeUndefined()
  })

  it('resets the section to the built-in defaults after confirmation', async () => {
    settingsRepository.write(LANDING_CONFIG_NAME, { brand: { name: 'Acme English' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<LandingSettingsPage />)
    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Acme English')

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))

    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Kuhedu English')
    expect(stored(LANDING_CONFIG_NAME)).toBeUndefined()
  })

  it('keeps the section when the reset is not confirmed', async () => {
    settingsRepository.write(LANDING_CONFIG_NAME, { brand: { name: 'Acme English' } })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<LandingSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Acme English')
  })
})

describe('LanguagesSettingsPage', () => {
  const rows = () => screen.getAllByRole('listitem')

  it('adds a language once its row is complete', async () => {
    render(<LanguagesSettingsPage />)
    expect(rows()).toHaveLength(3)

    await userEvent.click(screen.getByRole('button', { name: 'Add language' }))
    const added = within(rows()[3] as HTMLElement)
    // An unfinished row blocks saving and says why.
    expect(added.getByText('Use a short code such as bn or en-IN.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await userEvent.type(added.getByRole('textbox', { name: 'Language code' }), 'ta')
    await userEvent.type(added.getByRole('textbox', { name: 'Name in its own script' }), 'தமிழ்')
    await userEvent.type(added.getByRole('textbox', { name: /^Note in brackets/ }), 'Tamil')
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as { languages: { code: string }[] }
    expect(saved.languages.map((language) => language.code)).toEqual(['bn', 'hi', 'en', 'ta'])
    expect(saved.languages[3]).toEqual({
      code: 'ta',
      nativeName: 'தமிழ்',
      caption: 'Tamil',
      flagUrl: null,
    })
  })

  it('refuses a duplicate code', async () => {
    render(<LanguagesSettingsPage />)
    const code = within(rows()[1] as HTMLElement).getByRole('textbox', { name: 'Language code' })
    await userEvent.clear(code)
    await userEvent.type(code, 'bn')

    expect(screen.getByText('This code is already used by another language.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('reorders and removes languages, and repairs the pre-selected one', async () => {
    render(<LanguagesSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Move up: हिन्दी' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove language: বাংলা' }))
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as {
      languages: { code: string }[]
      defaultCode: string
    }
    expect(saved.languages.map((language) => language.code)).toEqual(['hi', 'en'])
    // Bengali was the pre-selected language; with it gone the first one takes over.
    expect(saved.defaultCode).toBe('hi')
  })

  it('saves an uploaded flag', async () => {
    render(<LanguagesSettingsPage />)
    await userEvent.upload(screen.getByLabelText('Flag: English'), pngFile())
    await within(rows()[2] as HTMLElement).findByRole('button', { name: 'Remove image' })
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as { languages: { flagUrl: string }[] }
    expect(saved.languages[2]?.flagUrl).toBe('data:image/webp;base64,UklGRg==')
  })
})

describe('ProfilesSettingsPage', () => {
  it('saves an uploaded picture and can go back to the bundled one', async () => {
    render(<ProfilesSettingsPage />)

    await userEvent.upload(screen.getByLabelText('Female picture: Adult (18+)'), pngFile())
    const useDefault = await screen.findByRole('button', { name: 'Use default' })
    await save()

    const saved = stored(PROFILES_CONFIG_NAME) as unknown as Record<
      string,
      { maleImageUrl: string; femaleImageUrl: string }
    >
    expect(saved.adult).toEqual({
      maleImageUrl: '/avatars/adult-male.svg',
      femaleImageUrl: 'data:image/webp;base64,UklGRg==',
    })
    expect(saved.child?.maleImageUrl).toBe('/avatars/child-male.svg')

    await userEvent.click(useDefault)
    await save()
    const again = stored(PROFILES_CONFIG_NAME) as unknown as Record<
      string,
      { femaleImageUrl: string }
    >
    expect(again.adult?.femaleImageUrl).toBe('/avatars/adult-female.svg')
  })
})
