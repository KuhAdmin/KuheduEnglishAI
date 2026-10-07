import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, PIXEL_PNG, seedSettings } from './helpers'

// Bengali is pre-selected by default, so the language step opens in Bengali.
const BN = { title: 'আপনার ভাষা বেছে নিন', next: 'এগিয়ে যান' }
const HI = { title: 'अपनी भाषा चुनें', next: 'आगे बढ़ें' }

test('"Get Started" leads through the account screen to the language step', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Get Started' }).click()
  await page.getByRole('link', { name: 'Continue as Guest' }).click()

  await expect(page).toHaveURL(/\/onboarding\/language$/)
  await expect(page.getByRole('heading', { name: BN.title })).toBeVisible()
})

test('the learner chooses a language and it is remembered', async ({ page }) => {
  await page.goto('/onboarding')
  await expect(page).toHaveURL(/\/onboarding\/language$/)

  await expect(page.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
  for (const flag of await page.locator('fieldset img').all()) {
    await expect(flag).toHaveJSProperty('complete', true)
    expect(await flag.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  }

  // Every card is a comfortable touch target.
  for (const card of await page.locator('fieldset label').all()) {
    expect((await card.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  }

  await page.getByText('हिन्दी').click()
  await expect(page.getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()

  const next = page.getByRole('button', { name: HI.next })
  await expect(next).toBeInViewport({ ratio: 1 })
  await next.click()
  await expect(page).toHaveURL(/\/onboarding\/profile$/)

  await page.goto('/onboarding/language')
  await expect(page.getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()
})

test('languages and flags come from the saved settings', async ({ page }) => {
  await page.route('**/uploads/*.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL_PNG }),
  )
  await seedSettings(page, 'languages', {
    defaultCode: 'ta',
    languages: [
      { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: '/uploads/ta.png' },
      { code: 'mr', nativeName: 'मराठी', caption: 'Marathi', flagUrl: '/uploads/mr.png' },
      { code: 'te', nativeName: 'తెలుగు', caption: 'Telugu' },
      { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: '/flags/us.svg' },
    ],
  })
  await page.goto('/onboarding/language')

  await expect(page.getByRole('radio', { name: 'தமிழ் (Tamil)' })).toBeChecked()
  await expect(page.getByRole('radio')).toHaveCount(4)
  await expect(page.locator('img[src="/uploads/ta.png"]')).toBeVisible()
  await expect(page.getByRole('radio', { name: /Bengali/ })).toHaveCount(0)
  // Tamil has no screen texts yet, so the page falls back to English.
  await expect(page.getByRole('heading', { name: 'Choose your language' })).toBeVisible()
})

test('the main action stays reachable when the list is long', async ({ page }) => {
  const languages = Array.from({ length: 14 }, (_, index) => ({
    code: `x${String.fromCharCode(97 + index)}`,
    nativeName: `Language ${index + 1}`,
  }))
  await seedSettings(page, 'languages', { languages, defaultCode: 'xa' })
  await page.goto('/onboarding/language')

  await expect(page.getByRole('radio')).toHaveCount(14)
  await expect(page.getByRole('button', { name: 'Continue' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)
})

test.describe('on a device set to Hindi', () => {
  test.use({ locale: 'hi-IN' })

  test('Hindi is suggested first and the page opens in Hindi', async ({ page }) => {
    await page.goto('/onboarding/language')
    await expect(page.getByRole('radio', { name: 'हिन्दी (Hindi)' })).toBeChecked()
    await expect(page.getByRole('heading', { name: HI.title })).toBeVisible()
  })
})
