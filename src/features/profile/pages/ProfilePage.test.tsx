import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { useThemeStore } from '@/shared/theme'
import { profileRoutes, profileSettingsRoutes } from '../index'

function renderProfile(initialPath: string = paths.profile) {
  const router = createMemoryRouter([...profileRoutes, ...profileSettingsRoutes], {
    initialEntries: [initialPath],
  })
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const settings = (name: string) => within(screen.getByRole('navigation', { name }))
const languages = (name: string) => within(screen.getByRole('group', { name }))

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useThemeStore.setState({ preference: 'auto' })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
})

afterEach(() => vi.unstubAllGlobals())

describe('ProfilePage', () => {
  it('lists the settings, each with its current value, and where the learner stands', async () => {
    useThemeStore.setState({ preference: 'sage-dusk' })
    renderProfile()

    expect(await screen.findByRole('heading', { level: 1, name: 'My profile' })).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Your learning' })).getByText('Week 1 of 50'),
    ).toBeVisible()

    const rows = settings('Settings').getAllByRole('link')
    expect(rows.map((row) => row.textContent)).toEqual([
      'Language English',
      // No voices in this test's browser, so the row says what the screen is for.
      'Voice settings Choose a voice for each tutor.',
      'Tutor avatar Male tutor',
      'Appearance Sage Dusk',
    ])
    expect(rows.map((row) => row.getAttribute('href'))).toEqual([
      paths.profileLanguage,
      paths.profileVoice,
      paths.profileTutor,
      paths.profileAppearance,
    ])
  })

  it('names the voice lessons are heard in, once the device has one', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn())
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [
        {
          name: 'Microsoft Heera - English (India)',
          lang: 'en-IN',
          localService: true,
          voiceURI: 'heera',
        },
        {
          name: 'Microsoft Ravi - English (India)',
          lang: 'en-IN',
          localService: true,
          voiceURI: 'ravi',
        },
      ],
    })
    useVoiceStore.setState({ voices: { en: { male: 'heera' } } })
    renderProfile()

    await screen.findByRole('heading', { level: 1, name: 'My profile' })
    expect(settings('Settings').getByRole('link', { name: /Voice settings/ })).toHaveTextContent(
      // The male tutor is theirs, and they gave him this voice.
      'Voice settings Heera',
    )
  })

  it('opens a setting on its own screen, with the way back', async () => {
    const router = renderProfile()

    await screen.findByRole('heading', { level: 1, name: 'My profile' })
    await userEvent.click(settings('Settings').getByRole('link', { name: /Appearance/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Appearance' })).toBeVisible()
    expect(screen.getByRole('radio', { name: /Auto/ })).toBeChecked()

    await userEvent.click(screen.getByRole('link', { name: 'Back to your profile' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'My profile' })).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.profile)
  })
})

describe('ProfileLanguagePage', () => {
  it('shows the language chosen during onboarding as the current one', async () => {
    useLanguageStore.setState({ language: 'hi' })
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('heading', { level: 1, name: 'भाषा' })).toBeVisible()
    expect(languages('भाषा').getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()
    expect(languages('भाषा').getByRole('radio', { name: 'বাংলা (Bengali)' })).not.toBeChecked()
  })

  it('saves another language on the tap and shows the screen in it at once', async () => {
    useLanguageStore.setState({ language: 'hi' })
    renderProfile(paths.profileLanguage)

    await userEvent.click(await screen.findByRole('radio', { name: 'বাংলা (Bengali)' }))

    expect(useLanguageStore.getState().language).toBe('bn')
    expect(screen.getByRole('heading', { level: 1, name: 'ভাষা' })).toBeVisible()
    expect(languages('ভাষা').getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
    expect(document.documentElement).toHaveAttribute('lang', 'bn')
  })

  it('ticks English for a learner who never chose, since that is what they see', async () => {
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('radio', { name: 'English (English only)' })).toBeChecked()
    expect(useLanguageStore.getState().language).toBeNull()
  })

  it('offers the languages the admin saved, with none ticked if the learner’s was removed', async () => {
    useLanguageStore.setState({ language: 'hi' })
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      defaultCode: 'ta',
      languages: [
        { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null },
        { code: 'mr', nativeName: 'मराठी', caption: 'Marathi', flagUrl: null },
      ],
    })
    renderProfile(paths.profileLanguage)

    expect(await screen.findByRole('radio', { name: 'தமிழ் (Tamil)' })).toBeInTheDocument()
    const radios = languages('भाषा').getAllByRole('radio')
    expect(radios).toHaveLength(2)
    for (const radio of radios) expect(radio).not.toBeChecked()
  })
})
