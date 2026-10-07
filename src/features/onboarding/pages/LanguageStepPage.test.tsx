import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { LanguageStepPage } from './LanguageStepPage'

function renderLanguageStep() {
  const router = createMemoryRouter(
    [
      { path: paths.onboardingLanguage, Component: LanguageStepPage },
      { path: paths.onboardingProfile, element: <h1>Profile step</h1> },
    ],
    { initialEntries: [paths.onboardingLanguage] },
  )
  return render(<RouterProvider router={router} />)
}

function mockDeviceLanguages(languages: string[]) {
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(languages)
}

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  mockDeviceLanguages(['en-US'])
})

afterEach(() => vi.restoreAllMocks())

describe('LanguageStepPage', () => {
  it('offers the default languages with Bengali pre-selected, and is shown in Bengali', () => {
    renderLanguageStep()

    expect(screen.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'हिन्दी (Hindi)' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'English (English only)' })).not.toBeChecked()
    expect(screen.getByText('বাংলা')).toHaveAttribute('lang', 'bn')

    expect(screen.getByRole('heading', { level: 1, name: 'আপনার ভাষা বেছে নিন' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'এগিয়ে যান' })).toBeVisible()
  })

  it('switches its own wording the moment another language is selected', async () => {
    renderLanguageStep()

    await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी (Hindi)' }))
    expect(screen.getByRole('heading', { level: 1, name: 'अपनी भाषा चुनें' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'आगे बढ़ें' })).toBeVisible()
    expect(screen.getByRole('heading', { level: 1 }).closest('[lang]')).toHaveAttribute(
      'lang',
      'hi',
    )

    await userEvent.click(screen.getByRole('radio', { name: 'English (English only)' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Choose your language' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeVisible()
    // Looking is not choosing: nothing is saved until Continue.
    expect(useLanguageStore.getState().language).toBeNull()
  })

  it("pre-selects the mother tongue the learner's device is set to", () => {
    mockDeviceLanguages(['en-IN', 'hi-IN'])
    renderLanguageStep()

    expect(screen.getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()
    expect(screen.getByRole('heading', { level: 1, name: 'अपनी भाषा चुनें' })).toBeVisible()
  })

  it('saves the chosen language and moves on', async () => {
    renderLanguageStep()

    await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी (Hindi)' }))
    await userEvent.click(screen.getByRole('button', { name: 'आगे बढ़ें' }))

    expect(useLanguageStore.getState().language).toBe('hi')
    expect(await screen.findByRole('heading', { name: 'Profile step' })).toBeVisible()
  })

  it('shows the languages and flags the admin saved', () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      defaultCode: 'ta',
      languages: [
        { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: '/uploads/ta.png' },
        { code: 'mr', nativeName: 'मराठी', caption: 'Marathi', flagUrl: null },
      ],
    })
    const { container } = renderLanguageStep()

    expect(screen.getByRole('radio', { name: 'தமிழ் (Tamil)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'मराठी (Marathi)' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Bengali/ })).not.toBeInTheDocument()
    expect(container.querySelector('img[src="/uploads/ta.png"]')).toBeInTheDocument()
    // No flag configured → initials instead of a broken image.
    expect(screen.getByText('mr')).toBeInTheDocument()
    // Tamil has no texts yet, so the screen falls back to English.
    expect(screen.getByRole('heading', { level: 1, name: 'Choose your language' })).toBeVisible()
  })

  it('keeps a returning learner’s earlier choice selected', () => {
    useLanguageStore.setState({ language: 'en' })
    renderLanguageStep()

    expect(screen.getByRole('radio', { name: 'English (English only)' })).toBeChecked()
  })
})
