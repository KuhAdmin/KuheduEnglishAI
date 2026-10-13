import type { SessionUser } from '@kuhedu/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { fakeServer, refusal, serverUnreachable } from '@/test/fakeServer'
import { authStepRoutes } from '../index'
import { NEW_ACCOUNT_STATE } from '../lib/newAccount'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: false,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

/** Opens the code step as the account screen does for a new account, unless told otherwise. */
function renderStep(state: unknown = NEW_ACCOUNT_STATE) {
  const router = createMemoryRouter(
    [
      ...authStepRoutes,
      { path: paths.signUp, element: <h1>Account screen</h1> },
      { path: paths.onboarding, element: <h1>Onboarding</h1> },
      // The app's front door, which sends a learner on from where they left off.
      { path: paths.landing, element: <h1>Front door</h1> },
    ],
    { initialEntries: [{ pathname: paths.verifyEmail, state }] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const codeField = () => screen.findByLabelText('Code from the email')

beforeAll(async () => {
  await import('./VerifyEmailPage')
})

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useSessionStore.getState().setUser(learner)
  fakeServer()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('VerifyEmailPage', () => {
  it('says where the code went and asks for it with a number pad', async () => {
    renderStep()

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeVisible()
    expect(screen.getByText('We sent a 6-digit code to asha@example.com.')).toBeVisible()
    expect(await codeField()).toHaveAttribute('inputmode', 'numeric')
    expect(await codeField()).toHaveAttribute('autocomplete', 'one-time-code')
  })

  it('wants six digits before it asks the server', async () => {
    const { calls } = fakeServer()
    renderStep()
    await userEvent.type(await codeField(), '12 34')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByText('Enter the 6-digit code from the email.')).toBeVisible()
    expect(await codeField()).toBeInvalid()
    expect(calls).toEqual([])
  })

  it('takes the code, however it was spaced, and leads a new account on to onboarding', async () => {
    const { calls } = fakeServer({ 'POST /auth/verify-email': {} })
    renderStep()
    await userEvent.type(await codeField(), '123 456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeVisible()
    expect(calls).toEqual([
      { method: 'POST', path: '/auth/verify-email', body: { code: '123456' } },
    ])
    expect(useSessionStore.getState().user?.emailVerified).toBe(true)
  })

  it('leads someone who came back to finish, by signing in, on from where they left off', async () => {
    fakeServer({ 'POST /auth/verify-email': {} })
    renderStep(null)
    await userEvent.type(await codeField(), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('heading', { name: 'Front door' })).toBeVisible()
  })

  it('says under the field when the code is wrong, and when there were too many tries', async () => {
    const { routes } = fakeServer({
      'POST /auth/verify-email': refusal(400, 'validation_failed', { code: 'auth.codeWrong' }),
    })
    renderStep()
    await userEvent.type(await codeField(), '000000')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByText('That code is not right, or it has expired.')).toBeVisible()
    expect(useSessionStore.getState().user?.emailVerified).toBe(false)

    routes['POST /auth/verify-email'] = refusal(429, 'rate_limited')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts.')
  })

  it('sends a new code on request, and says when it is too soon for another', async () => {
    const { routes } = fakeServer({ 'POST /auth/verify-email/resend': {} })
    renderStep()
    await userEvent.click(await screen.findByRole('button', { name: 'Send a new code' }))
    expect(await screen.findByText('We sent a new code.')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('We sent a new code.')

    routes['POST /auth/verify-email/resend'] = refusal(429, 'rate_limited')
    await userEvent.click(screen.getByRole('button', { name: 'Send a new code' }))
    expect(await screen.findByText(/A code was sent a moment ago/)).toBeVisible()
  })

  it('cannot be skipped: the only ways on are the code, or another address', async () => {
    renderStep()
    await codeField()

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Send a new code',
      'Verify',
      'Use a different email',
    ])
  })

  it('lets go of an address that was mistyped: signed out, and back to signing up', async () => {
    const { calls } = fakeServer({ 'POST /auth/sign-out': {} })
    renderStep()
    await userEvent.click(await screen.findByRole('button', { name: 'Use a different email' }))

    expect(await screen.findByRole('heading', { name: 'Account screen' })).toBeVisible()
    expect(calls).toEqual([{ method: 'POST', path: '/auth/sign-out', body: undefined }])
    expect(useSessionStore.getState().user).toBeNull()
  })

  it('stays on the code step, and says so, when the server could not be told of the sign-out', async () => {
    serverUnreachable()
    renderStep()
    await userEvent.click(await screen.findByRole('button', { name: 'Use a different email' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('That did not work.')
    expect(await codeField()).toBeVisible()
    expect(useSessionStore.getState().user?.email).toBe('asha@example.com')
  })

  it('is not for someone who is not signed in', async () => {
    useSessionStore.getState().setUser(null)
    renderStep()
    expect(await screen.findByRole('heading', { name: 'Account screen' })).toBeVisible()
  })

  it('sends someone whose address is already verified on, by the front door', async () => {
    useSessionStore.getState().setUser({ ...learner, emailVerified: true })
    renderStep()
    expect(await screen.findByRole('heading', { name: 'Front door' })).toBeVisible()
  })
})
