import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { fakeServer, refusal, serverUnreachable } from '@/test/fakeServer'
import { authStepRoutes } from '../index'

function renderScreen(language: string | null = null) {
  useLanguageStore.setState({ language })
  const router = createMemoryRouter(
    [...authStepRoutes, { path: paths.signIn, element: <h1>Account screen</h1> }],
    { initialEntries: [paths.forgotPassword] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const emailField = () => screen.findByLabelText('Email address')

/** The first step: give an address and ask for a code. */
async function askForCode(email = 'asha@example.com') {
  await userEvent.type(await emailField(), email)
  await userEvent.click(screen.getByRole('button', { name: 'Send code' }))
  return screen.findByRole('heading', { name: 'Choose a new password' })
}

beforeAll(async () => {
  await import('./ForgotPasswordPage')
})

beforeEach(() => {
  localStorage.clear()
  useSessionStore.setState({ user: null, loaded: false })
  fakeServer()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ForgotPasswordPage', () => {
  it('asks for the address first, and wants a real one', async () => {
    const { calls } = fakeServer()
    renderScreen()

    expect(await screen.findByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
    await userEvent.type(await emailField(), 'not-an-address')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible()
    expect(calls).toEqual([])
  })

  it('goes on to the code without saying whether the address has an account', async () => {
    const { calls } = fakeServer({ 'POST /auth/password/forgot': {} })
    renderScreen()

    const heading = await askForCode(' Asha@Example.com ')

    // The step changed in place: its heading is announced.
    expect(heading).toHaveFocus()
    expect(
      screen.getByText('If asha@example.com has an account, we sent it a 6-digit code.'),
    ).toBeVisible()
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/password/forgot', body: { email: 'asha@example.com' } },
    ])
  })

  it('sets the new password with the code, then leads back to signing in', async () => {
    const { calls } = fakeServer({
      'POST /auth/password/forgot': {},
      'POST /auth/password/reset': {},
    })
    renderScreen()
    await askForCode()

    await userEvent.type(screen.getByLabelText('Code from the email'), '123456')
    await userEvent.type(screen.getByLabelText('New password'), 'a brand new password')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))

    expect(await screen.findByRole('heading', { name: 'Your password is changed' })).toHaveFocus()
    expect(calls.at(-1)).toEqual({
      method: 'POST',
      path: '/auth/password/reset',
      body: { email: 'asha@example.com', code: '123456', password: 'a brand new password' },
    })
    // Changing a password signs nobody in.
    expect(useSessionStore.getState().user).toBeNull()

    await userEvent.click(screen.getByRole('link', { name: 'Sign In' }))
    expect(await screen.findByRole('heading', { name: 'Account screen' })).toBeVisible()
  })

  it('says which of the two is at fault: the code or the new password', async () => {
    fakeServer({
      'POST /auth/password/forgot': {},
      'POST /auth/password/reset': refusal(400, 'validation_failed', { code: 'auth.codeWrong' }),
    })
    renderScreen()
    await askForCode()

    await userEvent.type(screen.getByLabelText('Code from the email'), '123456')
    await userEvent.type(screen.getByLabelText('New password'), 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeVisible()

    await userEvent.type(screen.getByLabelText('New password'), ' but longer')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByText('That code is not right, or it has expired.')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
  })

  it('asks for another code without promising that one was sent', async () => {
    const { calls } = fakeServer({ 'POST /auth/password/forgot': {} })
    renderScreen()
    await askForCode()

    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }))

    expect(await screen.findByText(/a new code is on its way/)).toBeVisible()
    expect(calls).toHaveLength(2)
  })

  it('says so when the server cannot be reached, and stays on the step', async () => {
    serverUnreachable()
    renderScreen()
    await userEvent.type(await emailField(), 'asha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send code' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not work.')
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible()
  })

  it('leads back to signing in, and is shown in the learner’s language', async () => {
    renderScreen('hi')

    expect(await screen.findByRole('heading', { name: 'पासवर्ड भूल गए?' })).toBeVisible()
    await userEvent.click(screen.getByRole('link', { name: 'वापस जाएँ' }))
    expect(await screen.findByRole('heading', { name: 'Account screen' })).toBeVisible()
  })
})
