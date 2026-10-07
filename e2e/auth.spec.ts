import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, seedLanguage } from './helpers'

test('a newcomer goes landing → sign up → language step as a guest', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Get Started' }).click()

  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome to Kuhedu English' }),
  ).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Sign Up' })).toBeChecked()

  // Every control is a comfortable touch target.
  for (const control of [
    page.getByRole('link', { name: 'Back' }),
    page.getByRole('button', { name: 'Show password' }),
    page.getByRole('button', { name: 'Create Account' }),
    page.getByRole('button', { name: 'Continue with Google' }),
    page.getByRole('link', { name: 'Continue as Guest' }),
    page.getByRole('link', { name: 'Sign In' }),
  ]) {
    const box = await control.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }
  await expectNoHorizontalScroll(page)

  await page.getByRole('link', { name: 'Continue as Guest' }).click()
  await expect(page).toHaveURL(/\/onboarding\/language$/)
})

test('creating an account is not available yet, and says so', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Email address').fill('learner@example.com')
  await page.getByLabel('Password', { exact: true }).fill('a-long-password')

  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text')

  await page.getByRole('button', { name: 'Create Account' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Accounts are coming soon. For now, continue as a guest.',
  )
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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kuhedu English অ্যাপে স্বাগতম')
  await expect(page.locator('html')).toHaveAttribute('lang', 'bn')
  await expectNoHorizontalScroll(page)

  await page.reload()
  await expect(page.getByRole('combobox', { name: 'ভাষা' })).toHaveValue('bn')

  await page.getByRole('link', { name: 'অতিথি হিসেবে এগিয়ে যান' }).click()
  await expect(page).toHaveURL(/\/onboarding\/language$/)
  await expect(page.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
})

test('picking English here carries over to the language step too', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByRole('combobox', { name: 'Language' }).selectOption('hi')
  await page.getByRole('combobox', { name: 'भाषा' }).selectOption('en')
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible()

  await page.getByRole('link', { name: 'Continue as Guest' }).click()
  await expect(page.getByRole('radio', { name: 'English (English only)' })).toBeChecked()
})

test('a returning learner sees the screen in their language', async ({ page }) => {
  await seedLanguage(page, 'bn')
  await page.goto('/sign-up')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kuhedu English অ্যাপে স্বাগতম')
  await expect(page.getByRole('button', { name: 'অ্যাকাউন্ট তৈরি করুন' })).toBeVisible()
  await expectNoHorizontalScroll(page)
})
