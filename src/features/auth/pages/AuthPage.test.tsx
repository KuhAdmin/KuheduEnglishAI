import type { SessionUser } from '@kuhedu/contracts'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { fakeServer, refusal, serverUnreachable } from '@/test/fakeServer'
import { authRoutes, authStepRoutes } from '../index'
import { requireAdmin } from '../lib/requireAdmin'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: false,
  role: 'learner',
  displayName: null,
}
const admin: SessionUser = { ...learner, id: 'u-2', email: 'admin@example.com', role: 'admin' }

/** `language` is what the learner chose earlier; `null` for a newcomer. */
function renderApp(initialPath: string = paths.signIn, language: string | null = null) {
  useLanguageStore.setState({ language })
  const router = createMemoryRouter(
    [
      ...authRoutes,
      ...authStepRoutes,
      { path: paths.landing, element: <h1>Landing</h1> },
      { path: paths.onboarding, element: <h1>Onboarding</h1> },
      { path: paths.home, element: <h1>Journey</h1> },
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

// The routes are lazy; load their chunks up front so the first test does not wait on the transform.
beforeAll(async () => {
  await import('./AuthPage')
  await import('./VerifyEmailPage')
})

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
  useLanguageStore.setState({ language: null })
  fakeServer({ 'GET /auth/session': { body: { user: null } } })
})

afterEach(() => {
  vi.unstubAllGlobals()
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
    // A new account is told beforehand that a code will be sent.
    expect(screen.getByLabelText('Email address')).toHaveAccessibleDescription(
      'We’ll send a code to this address to verify it.',
    )
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument()
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

  it('checks a new account’s email and password before asking the server', async () => {
    const { calls } = fakeServer()
    renderApp(paths.signUp)
    await userEvent.click(await screen.findByRole('button', { name: 'Create Account' }))
    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(screen.getByLabelText('Email address')).toBeInvalid()

    await fillIn('learner@example.com', 'short')
    await userEvent.click(submitButton('Create Account'))
    expect(await screen.findByText('Use at least 8 characters.')).toBeVisible()
    expect(screen.queryByText('Enter your email address.')).not.toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it('creates an account and goes on to the emailed code', async () => {
    const { calls } = fakeServer({ 'POST /auth/sign-up': { status: 201, body: { user: learner } } })
    renderApp(paths.signUp)
    await fillIn(' Asha@Example.com', 'long-enough-password')
    await userEvent.click(submitButton('Create Account'))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeVisible()
    expect(screen.getByText('We sent a 6-digit code to asha@example.com.')).toBeVisible()
    expect(calls).toEqual([
      {
        method: 'POST',
        path: '/auth/sign-up',
        body: { email: 'asha@example.com', password: 'long-enough-password' },
      },
    ])
    expect(useSessionStore.getState().user).toEqual(learner)
    // Who is signed in is the server's to remember: the browser's storage holds none of it.
    expect(JSON.stringify(localStorage)).not.toMatch(/asha|long-enough-password/)
  })

  it('says under the field that an address already has an account', async () => {
    fakeServer({
      'POST /auth/sign-up': refusal(409, 'conflict', { email: 'auth.emailTaken' }),
    })
    const router = renderApp(paths.signUp)
    await fillIn('asha@example.com', 'long-enough-password')
    await userEvent.click(submitButton('Create Account'))

    expect(
      await screen.findByText('This email already has an account. Sign in instead.'),
    ).toBeVisible()
    expect(screen.getByLabelText('Email address')).toBeInvalid()
    expect(router.state.location.pathname).toBe(paths.signUp)
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('says so when the server cannot be reached, and a guest can still go on', async () => {
    serverUnreachable()
    renderApp(paths.signUp)
    await fillIn('asha@example.com', 'long-enough-password')
    await userEvent.click(submitButton('Create Account'))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not work.')

    await userEvent.click(screen.getByRole('link', { name: 'Continue as Guest' }))
    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeVisible()
  })

  it('signs a learner in to their journey', async () => {
    fakeServer({ 'POST /auth/sign-in': { body: { user: { ...learner, emailVerified: true } } } })
    renderApp()
    await fillIn('asha@example.com', 'the-password')
    await userEvent.click(submitButton('Sign In'))
    expect(await screen.findByRole('heading', { name: 'Journey' })).toBeVisible()
  })

  it('opens the admin area for an admin', async () => {
    fakeServer({ 'POST /auth/sign-in': { body: { user: admin } } })
    renderApp()
    await fillIn('admin@example.com', 'the-password')
    await userEvent.click(submitButton('Sign In'))

    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeVisible()
    expect(useSessionStore.getState().user?.role).toBe('admin')
  })

  it('rejects wrong credentials without saying which part was wrong', async () => {
    fakeServer({ 'POST /auth/sign-in': refusal(401, 'unauthenticated') })
    renderApp()
    await fillIn('asha@example.com', 'wrong-password')
    await userEvent.click(submitButton('Sign In'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(useSessionStore.getState().user).toBeNull()

    // The message clears as soon as they start correcting.
    await userEvent.type(screen.getByLabelText('Password'), 'x')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('asks someone who keeps trying to wait', async () => {
    fakeServer({ 'POST /auth/sign-in': refusal(429, 'rate_limited') })
    renderApp()
    await fillIn('asha@example.com', 'a-guess')
    await userEvent.click(submitButton('Sign In'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })

  it('asks for missing fields when signing in', async () => {
    renderApp()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign In' }))

    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(screen.getByLabelText('Email address')).toBeInvalid()
  })

  it('leads from "Forgot password?" to choosing a new one', async () => {
    const router = renderApp()
    await userEvent.click(await screen.findByRole('link', { name: 'Forgot password?' }))

    expect(
      await screen.findByRole('heading', { name: 'Forgot your password?' }, { timeout: 5000 }),
    ).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.forgotPassword)
  })

  it('says Google sign-in is not available in a build without its id', async () => {
    renderApp(paths.signUp)
    await userEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in is not available yet.')
  })

  it('lets a visitor continue as a guest into onboarding', async () => {
    renderApp(paths.signUp)
    await userEvent.click(await screen.findByRole('link', { name: 'Continue as Guest' }))
    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeVisible()
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
})

describe('someone already signed in', () => {
  it('is told who they are instead of being asked again, and can sign out', async () => {
    const { calls } = fakeServer({ 'POST /auth/sign-out': {} })
    useSessionStore.getState().setUser(learner)
    renderApp()

    expect(await screen.findByText('You are signed in as asha@example.com.')).toBeVisible()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', paths.home)
    // Their address is not verified yet, so the way to do it is offered.
    expect(screen.getByRole('link', { name: 'Verify your email' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByLabelText('Password')).toBeVisible()
    expect(calls).toEqual([{ method: 'POST', path: '/auth/sign-out', body: undefined }])
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('stays signed in, and says so, when the server could not be told of the sign-out', async () => {
    serverUnreachable()
    useSessionStore.getState().setUser({ ...learner, emailVerified: true })
    renderApp()

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not work.')
    expect(screen.queryByRole('link', { name: 'Verify your email' })).not.toBeInTheDocument()
    expect(useSessionStore.getState().user?.email).toBe('asha@example.com')
  })

  it('goes straight to the admin area from sign-in only, when an admin', async () => {
    useSessionStore.getState().setUser(admin)
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

  it('waits for the server to say who is signed in, and lets an admin through', async () => {
    fakeServer({ 'GET /auth/session': { body: { user: admin } } })
    renderApp(paths.admin)

    expect(await screen.findByRole('heading', { name: 'Admin area' })).toBeVisible()
  })

  it('keeps a signed-in learner out', async () => {
    fakeServer({ 'GET /auth/session': { body: { user: learner } } })
    const router = renderApp(paths.admin)

    expect(await screen.findByText('You are signed in as asha@example.com.')).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.signIn)
  })

  it('keeps everyone out while there is no server to ask', async () => {
    serverUnreachable()
    const router = renderApp(paths.admin)

    expect(await screen.findByRole('button', { name: 'Sign In' })).toBeVisible()
    expect(router.state.location.pathname).toBe(paths.signIn)
  })
})
