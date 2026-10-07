import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { authRoutes } from '../index'
import { verifyLocalAdmin } from '../lib/localAdmin'
import { requireAdmin } from '../lib/requireAdmin'
import { useSessionStore } from '../store/useSessionStore'

/** `language` is what the learner chose earlier; `null` for a newcomer. */
function renderApp(initialPath: string = paths.signIn, language: string | null = null) {
  useLanguageStore.setState({ language })
  const router = createMemoryRouter(
    [
      ...authRoutes,
      { path: paths.landing, element: <h1>Landing</h1> },
      { path: paths.onboarding, element: <h1>Onboarding</h1> },
      { path: paths.admin, loader: requireAdmin, element: <h1>Admin area</h1> },
    ],
    { initialEntries: [paths.landing, initialPath] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const emailField = () => screen.findByLabelText('Email address')
const submitButton = (name: string) => screen.getByRole('button', { name })

async function fillIn(email: string, password: string) {
  await userEvent.type(await emailField(), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
}

// The route is lazy; load its chunk up front so the first test does not wait on the transform.
beforeAll(async () => {
  await import('./AuthPage')
})

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ role: null })
  useLanguageStore.setState({ language: null })
})

describe('verifyLocalAdmin', () => {
  it('accepts only the default admin credentials', () => {
    expect(verifyLocalAdmin('admin', 'Kuhedu@123')).toBe(true)
    expect(verifyLocalAdmin(' Admin ', 'Kuhedu@123')).toBe(true)
    expect(verifyLocalAdmin('admin', 'kuhedu@123')).toBe(false)
    expect(verifyLocalAdmin('admin', '')).toBe(false)
    expect(verifyLocalAdmin('learner', 'Kuhedu@123')).toBe(false)
  })
})

describe('AuthPage', () => {
  it('opens on the half its path names, under the brand from the landing settings', async () => {
    settingsRepository.write(LANDING_CONFIG_NAME, { brand: { name: 'Acme English' } })
    renderApp(paths.signUp)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome to Acme English' }),
    ).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Sign Up' })).toBeChecked()
    expect(submitButton('Create Account')).toBeVisible()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).not.toBeInTheDocument()
  })

  it('switches halves in place, keeping what was typed and dropping the complaints', async () => {
    const router = renderApp(paths.signUp)
    await userEvent.type(await emailField(), 'not-an-email')
    await userEvent.click(submitButton('Create Account'))
    expect(await screen.findByText('Enter a valid email address.')).toBeVisible()

    await userEvent.click(screen.getByRole('radio', { name: 'Sign In' }))
    expect(router.state.location.pathname).toBe(paths.signIn)
    expect(submitButton('Sign In')).toBeVisible()
    expect(screen.getByLabelText('Email address')).toHaveValue('not-an-email')
    expect(screen.queryByText('Enter a valid email address.')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')

    await userEvent.click(screen.getByRole('link', { name: 'Sign Up' }))
    expect(router.state.location.pathname).toBe(paths.signUp)
    expect(screen.getByLabelText('Email address')).toHaveValue('not-an-email')

    // Switching replaced the entry, so Back leaves the screen.
    await userEvent.click(screen.getByRole('link', { name: 'Back' }))
    expect(await screen.findByRole('heading', { name: 'Landing' })).toBeVisible()
  })

  it('checks a new account’s email and password before anything else', async () => {
    renderApp(paths.signUp)
    await userEvent.click(await screen.findByRole('button', { name: 'Create Account' }))
    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(screen.getByLabelText('Email address')).toBeInvalid()

    await fillIn('learner@example.com', 'short')
    await userEvent.click(submitButton('Create Account'))
    expect(await screen.findByText('Use at least 8 characters.')).toBeVisible()
    expect(screen.queryByText('Enter your email address.')).not.toBeInTheDocument()
  })

  it('says accounts are not available yet instead of pretending to create one', async () => {
    const router = renderApp(paths.signUp)
    await fillIn('learner@example.com', 'long-enough-password')
    await userEvent.click(submitButton('Create Account'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Accounts are coming soon.')
    expect(router.state.location.pathname).toBe(paths.signUp)
    expect(useSessionStore.getState().role).toBeNull()
    expect(localStorage.getItem('kuhedu-session') ?? '').not.toContain('long-enough-password')

    await userEvent.type(screen.getByLabelText('Password'), '!')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Accounts are coming soon.')
  })

  it('lets a visitor continue as a guest into onboarding', async () => {
    renderApp(paths.signUp)
    await userEvent.click(await screen.findByRole('link', { name: 'Continue as Guest' }))
    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeVisible()
  })

  it('opens the admin area for the default admin', async () => {
    renderApp()
    await fillIn('admin', 'Kuhedu@123')
    await userEvent.click(submitButton('Sign In'))

    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeVisible()
    expect(useSessionStore.getState().role).toBe('admin')
  })

  it('rejects wrong credentials without saying which part was wrong', async () => {
    renderApp()
    await fillIn('admin', 'wrong-password')
    await userEvent.click(submitButton('Sign In'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(useSessionStore.getState().role).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Admin area' })).not.toBeInTheDocument()

    // The message clears as soon as they start correcting.
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('asks for missing fields when signing in', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(screen.getByLabelText('Email address')).toBeInvalid()
  })

  it('answers "Forgot password?" honestly while there are no accounts', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: 'Forgot password?' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Accounts are coming soon.')
  })

  it('is shown in the learner’s language', async () => {
    renderApp(paths.signIn, 'hi')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kuhedu English में आपका स्वागत है' }),
    ).toBeVisible()
    expect(screen.getByLabelText('पासवर्ड')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'पासवर्ड दिखाएँ' })).toBeInTheDocument()
  })

  it('opens in English for a newcomer and switches to the language they pick', async () => {
    renderApp(paths.signUp)
    const picker = await screen.findByRole('combobox', { name: 'Language' })
    expect(picker).toHaveValue('en')
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeVisible()
    expect(useLanguageStore.getState().language).toBeNull()

    await userEvent.type(screen.getByLabelText('Email address'), 'learner@example.com')
    await userEvent.selectOptions(picker, 'हिन्दी')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Kuhedu English में आपका स्वागत है',
    )
    expect(screen.getByRole('combobox', { name: 'भाषा' })).toHaveValue('hi')
    // Saved as the learner's language, so the rest of the app and onboarding follow it.
    expect(useLanguageStore.getState().language).toBe('hi')
    expect(document.documentElement).toHaveAttribute('lang', 'hi')
    expect(screen.getByLabelText('ईमेल पता')).toHaveValue('learner@example.com')
  })

  it('offers the languages from the settings, and English even when it was removed', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [
        { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null },
        { code: 'bn', nativeName: 'বাংলা', caption: 'Bengali', flagUrl: null },
      ],
    })
    // Hindi was chosen earlier but is no longer offered: the picker reads English.
    renderApp(paths.signIn, 'hi')

    const picker = await screen.findByRole('combobox')
    expect(
      within(picker)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['தமிழ்', 'বাংলা', 'English'])
    expect(within(picker).getByRole('option', { name: 'বাংলা' })).toHaveAttribute('lang', 'bn')
    expect(picker).toHaveValue('en')
  })

  it('sends an already signed-in admin straight to the admin area from sign-in only', async () => {
    useSessionStore.setState({ role: 'admin' })
    renderApp(paths.signUp)
    expect(await screen.findByRole('button', { name: 'Create Account' })).toBeVisible()

    await userEvent.click(screen.getByRole('radio', { name: 'Sign In' }))
    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeVisible()
  })
})

describe('requireAdmin', () => {
  it('sends visitors who are not signed in to the sign-in screen', async () => {
    const router = renderApp(paths.admin)

    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.signIn)
  })

  it('lets a signed-in admin through, and no longer after sign-out', async () => {
    useSessionStore.setState({ role: 'admin' })
    renderApp(paths.admin)
    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeVisible()

    useSessionStore.getState().signOut()
    expect(() => requireAdmin()).toThrow()
  })

  it('remembers the session in this browser', () => {
    useSessionStore.getState().signInAsAdmin()
    expect(JSON.parse(localStorage.getItem('kuhedu-session') ?? '{}').state.role).toBe('admin')
  })
})
