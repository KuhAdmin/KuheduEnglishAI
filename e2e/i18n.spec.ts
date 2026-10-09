import { expect, test } from '@playwright/test'
import { seedLanguage } from './helpers'

const html = 'html'

test('the language step changes its own wording the moment a language is tapped', async ({
  page,
}) => {
  await page.goto('/onboarding/language')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('আপনার ভাষা বেছে নিন')

  await page.getByText('हिन्दी').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('अपनी भाषा चुनें')
  await expect(page.getByRole('button', { name: 'आगे बढ़ें' })).toBeVisible()

  await page.getByText('English only').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose your language')
  await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible()
})

test('after choosing Hindi, every following screen is in Hindi', async ({ page }) => {
  await page.goto('/onboarding/language')
  await page.getByText('हिन्दी').click()
  await page.getByRole('button', { name: 'आगे बढ़ें' }).click()

  // About you
  await expect(page).toHaveURL(/\/onboarding\/profile$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('अपने बारे में बताएँ')
  await expect(page.getByRole('radio', { name: 'वयस्क (18+)' })).toBeChecked()
  await expect(page.locator(html)).toHaveAttribute('lang', 'hi')
  await page.getByRole('button', { name: 'आगे बढ़ें' }).click()

  // Placement intro
  await expect(page).toHaveURL(/\/onboarding\/placement$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('आइए, आपका शुरुआती स्तर जानें')
  await page.getByRole('link', { name: 'प्लेसमेंट टेस्ट शुरू करें' }).click()

  // Beyond onboarding, and after a reload
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('पहले, चलिए सुनते हैं')
  await page.goto('/home')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('आपकी 50 हफ़्तों की यात्रा')
  await page.goto('/profile/appearance')
  await expect(page.getByRole('radio', { name: 'सेज डस्क' })).toBeVisible()
})

test('the language can be changed on Profile, at once and for every screen', async ({ page }) => {
  await seedLanguage(page, 'hi')
  await page.goto('/profile')
  // The row says which language is in use, and opens the screen that changes it.
  await page.getByRole('link', { name: 'भाषा हिन्दी' }).click()
  await expect(page).toHaveURL(/\/profile\/language$/)
  await expect(page.getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()

  await page.getByText('বাংলা').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ভাষা')
  await expect(page.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
  await expect(page.locator(html)).toHaveAttribute('lang', 'bn')

  await page.reload()
  await expect(page.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
  await page.getByRole('link', { name: 'প্রোফাইলে ফিরে যান' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('আমার প্রোফাইল')
  await page.goto('/home')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('আপনার ৫০ সপ্তাহের যাত্রা')
})

test('Hindi and Bengali text are drawn with their bundled fonts', async ({ page }) => {
  await seedLanguage(page, 'hi')
  await page.goto('/onboarding/profile')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('अपने बारे में बताएँ')
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "Baloo 2 Variable"', 'अ'))).toBe(true)

  // The language list always shows the Bengali name, whatever the page language.
  await page.goto('/onboarding/language')
  await expect(page.getByText('বাংলা')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(await page.evaluate(() => document.fonts.check('16px "Baloo Da 2 Variable"', 'ব'))).toBe(
    true,
  )
})

test('a learner who has not chosen yet sees English outside onboarding', async ({ page }) => {
  await page.goto('/home')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your 50-week journey')
  await expect(page.locator(html)).toHaveAttribute('lang', 'en')
})
