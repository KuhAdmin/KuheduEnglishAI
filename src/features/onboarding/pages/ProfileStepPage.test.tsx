import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { PROFILES_CONFIG_NAME } from '@/shared/lib/appConfig/profilesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { I18nProvider } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { useOnboardingStore } from '../store/useOnboardingStore'
import { ProfileStepPage } from './ProfileStepPage'

function renderProfileStep(language = 'en') {
  const router = createMemoryRouter(
    [
      { path: paths.onboardingProfile, Component: ProfileStepPage },
      { path: paths.onboardingPlacement, element: <h1>Placement intro</h1> },
    ],
    { initialEntries: [paths.onboardingProfile] },
  )
  return render(
    <I18nProvider language={language}>
      <RouterProvider router={router} />
    </I18nProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
  useOnboardingStore.setState({ ageGroup: null })
})

describe('ProfileStepPage', () => {
  it('offers the three age groups with Adult pre-selected', () => {
    const { container } = renderProfileStep()

    expect(screen.getByRole('heading', { level: 1, name: 'Tell us about yourself' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Child (6–12)' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Teenager (13–18)' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Adult (18+)' })).toBeChecked()
    // A male and a female picture per group.
    expect(container.querySelectorAll('img')).toHaveLength(6)
    expect(container.querySelector('img[src="/avatars/child-female.svg"]')).toBeInTheDocument()
  })

  it('is shown in the learner’s language', () => {
    renderProfileStep('bn')

    expect(screen.getByRole('heading', { level: 1, name: 'আপনার সম্পর্কে বলুন' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'প্রাপ্তবয়স্ক (১৮+)' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'এগিয়ে যান' })).toBeVisible()
  })

  it('saves the chosen age group and moves on to the placement intro', async () => {
    renderProfileStep()

    await userEvent.click(screen.getByRole('radio', { name: 'Child (6–12)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(useOnboardingStore.getState().ageGroup).toBe('child')
    expect(await screen.findByRole('heading', { name: 'Placement intro' })).toBeVisible()
  })

  it('shows the profile pictures the admin saved', () => {
    settingsRepository.write(PROFILES_CONFIG_NAME, {
      adult: { maleImageUrl: '/uploads/man.webp', femaleImageUrl: '/uploads/woman.webp' },
    })
    const { container } = renderProfileStep()

    expect(container.querySelector('img[src="/uploads/man.webp"]')).toBeInTheDocument()
    expect(container.querySelector('img[src="/uploads/woman.webp"]')).toBeInTheDocument()
    expect(container.querySelector('img[src="/avatars/teen-male.svg"]')).toBeInTheDocument()
  })

  it('keeps a returning learner’s earlier answer selected', () => {
    useOnboardingStore.setState({ ageGroup: 'teen' })
    renderProfileStep()

    expect(screen.getByRole('radio', { name: 'Teenager (13–18)' })).toBeChecked()
  })
})
