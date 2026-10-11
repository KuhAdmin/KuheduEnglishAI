import type { SessionUser } from '@kuhedu/contracts'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/shared/lib/account'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { fakeServer, refusal } from '@/test/fakeServer'
import { authStepRoutes } from '../index'
import { NEW_ACCOUNT_STATE } from '../lib/newAccount'

const learner: SessionUser = {
  id: 'u-1',
  email: 'asha@example.com',
  emailVerified: false,
  role: 'learner',
  displayName: null,
}

/** Opens the code step as the account screen does for a new account, unless told otherwise. */
function renderStep(state: unknown = NEW_ACCOUNT_STATE) {
  const router = createMemoryRouter(
    [
      ...authStepRoutes,
      { path: paths.signUp, element: <h1>Account screen</h1> },
      { path: paths.onboarding, element: <h1>Onboarding</h1> },
      { path: paths.home, element: <h1>Journey</h1> },
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

  it('leads someone who came from their account back to their journey', async () => {
    fakeServer({ 'POST /auth/verify-email': {} })
    renderStep(null)
    await userEvent.type(await codeField(), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    expect(await screen.findByRole('heading', { name: 'Journey' })).toBeVisible()
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

  it('can wait: "Do this later" goes on without a code', async () => {
    const { calls } = fakeServer()
    renderStep()
    await userEvent.click(await screen.findByRole('link', { name: 'Do this later' }))

    expect(await screen.findByRole('heading', { name: 'Onboarding' })).toBeVisible()
    expect(calls).toEqual([])
  })

  it('is not for a guest', async () => {
    useSessionStore.getState().setUser(null)
    renderStep()
    expect(await screen.findByRole('heading', { name: 'Account screen' })).toBeVisible()
  })

  it('sends someone whose address is verified on to their journey', async () => {
    useSessionStore.getState().setUser({ ...learner, emailVerified: true })
    renderStep()
    expect(await screen.findByRole('heading', { name: 'Journey' })).toBeVisible()
  })
})
