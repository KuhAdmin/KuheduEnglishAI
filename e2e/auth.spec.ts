import type { Page } from '@playwright/test'
import {
  expect,
  expectNoHorizontalScroll,
  LEARNER,
  seedLanguage,
  signedInAs,
  test,
} from './helpers'

// The account screen is for someone who is not signed in yet.
test.beforeEach(({ page }) => signedInAs(page, null))

test('a newcomer goes from the landing page to sign up, and no further without an account', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Get Started' }).click()

  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome here' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Sign Up' })).toBeChecked()

  // Every control is a comfortable touch target.
  for (const control of [
    page.getByRole('link', { name: 'Back' }),
    page.getByRole('button', { name: 'Show password' }),
    page.getByRole('button', { name: 'Create Account' }),
    page.getByRole('button', { name: 'Continue with Google' }),
    page.getByRole('link', { name: 'Sign In' }),
  ]) {
    const box = await control.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }
  await expectNoHorizontalScroll(page)

  // There are no guests: nothing here leads into the app, and its screens lead back here.
  await expect(page.getByText(/guest/i)).toHaveCount(0)
  for (const learnerScreen of ['/onboarding', '/home', '/lessons/weeks/1/days/1', '/profile']) {
    await page.goto(learnerScreen)
    await expect(page).toHaveURL(/\/sign-in$/)
  }
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible()
})

/**
 * A server for the account screens, as far as they need one: it makes the account, takes one
 * code and no other, and signs out. What the real one does is its own tests' to say.
 */
async function accountServer(page: Page, code: string) {
  const account = {
    id: 'u-1',
    email: 'learner@example.com',
    emailVerified: false,
    role: 'learner',
    displayName: null,
  }
  let user: typeof account | null = null
  const asked: string[] = []

  await signedInAs(page, null)
  await page.route('**/api/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/auth', '')
    asked.push(path)
    if (path === '/session') return route.fulfill({ json: { user } })
    if (path === '/sign-up') {
      user = { ...account }
      return route.fulfill({ status: 201, json: { user } })
    }
    if (path === '/verify-email') {
      const given = (route.request().postDataJSON() as { code: string }).code
      if (given !== code) {
        return route.fulfill({
          status: 400,
          json: {
            error: {
              code: 'validation_failed',
              message: 'The code is not right',
              fields: { code: 'auth.codeWrong' },
            },
          },
        })
      }
      if (user) user = { ...user, emailVerified: true }
      return route.fulfill({ status: 204 })
    }
    if (path === '/verify-email/resend') return route.fulfill({ status: 204 })
    if (path === '/sign-out') {
      user = null
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ status: 404, json: { error: { code: 'not_found', message: path } } })
  })
  return { asked }
}

test('an account is made by matching the code sent to the address, and not before', async ({
  page,
}) => {
  await accountServer(page, '482913')
  await page.goto('/sign-up')
  await page.getByLabel('Email address').fill('learner@example.com')
  await page.getByLabel('Password', { exact: true }).fill('a-long-password')

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/verify-email$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your email')
  await expect(page.getByText('We sent a 6-digit code to learner@example.com.')).toBeVisible()

  // The code is the only way on: there is nothing to skip it with, here or by going round.
  await expect(page.getByRole('link')).toHaveCount(0)
  const code = page.getByLabel('Code from the email')
  await expect(code).toHaveAttribute('inputmode', 'numeric')
  for (const name of ['Verify', 'Use a different email', 'Send a new code']) {
    const box = await page.getByRole('button', { name }).boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
  }
  await expect(page.getByRole('button', { name: 'Verify' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  await page.goto('/sign-in')
  await expect(
    page.getByText('Enter the code we emailed you to finish creating your account.'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue' })).toHaveCount(0)
  await page.goto('/')
  await expect(page).toHaveURL(/\/verify-email$/)

  // A code that does not match makes nothing.
  await code.fill('111111')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByText('That code is not right, or it has expired.')).toBeVisible()
  await expect(page).toHaveURL(/\/verify-email$/)

  await page.getByRole('button', { name: 'Send a new code' }).click()
  await expect(page.getByRole('status')).toHaveText('We sent a new code.')

  // The one that does: the account is made, and onboarding is next.
  await code.fill('482 913')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).toHaveURL(/\/onboarding\/language$/)

  await page.goto('/sign-in')
  await expect(page.getByText('You are signed in as learner@example.com.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Continue' })).toBeVisible()
})

test('an address that was mistyped is let go of from the code step', async ({ page }) => {
  const { asked } = await accountServer(page, '482913')
  await page.goto('/sign-up')
  await page.getByLabel('Email address').fill('learner@example.com')
  await page.getByLabel('Password', { exact: true }).fill('a-long-password')
  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page).toHaveURL(/\/verify-email$/)

  await page.getByRole('button', { name: 'Use a different email' }).click()

  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  expect(asked).toContain('/sign-out')
  // Signed out: the code step is no longer theirs to open.
  await page.goto('/verify-email')
  await expect(page).toHaveURL(/\/sign-up$/)
})

test('switching between the halves keeps the email, and Back returns to the landing page', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await page.getByLabel('Email address').fill('learner@example.com')

  await page.getByText('Sign Up', { exact: true }).first().click()
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  await expect(page.getByLabel('Email address')).toHaveValue('learner@example.com')

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
})

test('a newcomer picks their language here and onboarding carries on in it', async ({ page }) => {
  await page.goto('/sign-up')
  const picker = page.getByRole('combobox', { name: 'Language' })
  await expect(picker).toHaveValue('en')
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()
  expect(Math.round((await picker.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)

  await picker.selectOption('bn')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('এখানে আপনাকে স্বাগতম')
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expectNoHorizontalScroll(page)

  await page.reload()
  await expect(page.getByRole('combobox', { name: 'ভাষা' })).toHaveValue('bn')

  // With an account, the app opens in onboarding, in the language picked here.
  await signedInAs(page, LEARNER)
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/language$/)
  await expect(page.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
})

test('picking English here carries over to the language step too', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('hi')
  await page.getByRole('combobox', { name: 'भाषा' }).selectOption('en')
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()

  await signedInAs(page, LEARNER)
  await page.goto('/')
  await expect(page.getByRole('radio', { name: 'English (English only)' })).toBeChecked()
})

test('a returning learner sees the screen in their language', async ({ page }) => {
  await seedLanguage(page, 'bn')
  await page.goto('/sign-up')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('এখানে আপনাকে স্বাগতম')
  await expect(page.getByRole('button', { name: 'অ্যাকাউন্ট তৈরি করুন' })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
