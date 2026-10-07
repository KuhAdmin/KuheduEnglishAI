import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, PIXEL_PNG, seedSettings } from './helpers'

const HEADLINE = {
  bn: 'আসুন, বাস্তব পরিস্থিতিতে ইংরেজি শিখি',
  hi: 'आइए, असल परिस्थितियों में अंग्रेज़ी सीखें',
  en: 'Let’s learn English in real-life situations',
}

test('shows the default landing page with the primary action in reach', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(HEADLINE.bn)
  await expect(page.getByText('Kuhedu English')).toBeVisible()

  const cta = page.getByRole('link', { name: 'Get Started' })
  await expect(cta).toBeInViewport({ ratio: 1 })
  const box = await cta.boundingBox()
  expect(box?.height).toBeGreaterThanOrEqual(44)

  const signIn = page.getByRole('link', { name: 'Sign in' })
  await expect(signIn).toBeInViewport({ ratio: 1 })
  expect((await signIn.boundingBox())?.height).toBeGreaterThanOrEqual(44)

  await cta.click()
  await expect(page).toHaveURL(/\/sign-up$/)
})

test('the headline slides to the next language every 5 seconds without moving the buttons', async ({
  page,
}) => {
  await page.goto('/')
  const headline = page.getByRole('heading', { level: 1 })
  const cta = page.getByRole('link', { name: 'Get Started' })
  await expect(headline).toHaveText(HEADLINE.bn)
  const startedAt = Date.now()
  // Measure once the page's entrance animation has settled.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((animation) => animation.finished)),
  )
  const ctaTop = (await cta.boundingBox())?.y

  await expect(headline).toHaveText(HEADLINE.hi, { timeout: 8000 })
  // Not early: the first headline was given its full five seconds.
  expect(Date.now() - startedAt).toBeGreaterThan(4000)
  // The incoming headline animates in from the right.
  expect(
    await headline.evaluate((element) => {
      const slide = element.parentElement
      return slide ? getComputedStyle(slide).animationName : null
    }),
  ).toBe('slide-in-left')
  await expectNoHorizontalScroll(page)
  // All headlines share one slot, so nothing below shifts.
  expect((await cta.boundingBox())?.y).toBe(ctaTop)

  await expect(headline).toHaveText(HEADLINE.en, { timeout: 8000 })
  await expect(headline).toBeInViewport({ ratio: 1 })
  expect((await cta.boundingBox())?.y).toBe(ctaTop)
})

test('tapping a language shows its headline and stops the rotation', async ({ page }) => {
  await page.goto('/')
  const headline = page.getByRole('heading', { level: 1 })
  await expect(headline).toHaveText(HEADLINE.bn)

  const english = page.getByRole('button', { name: 'English' })
  // Rounded: sub-pixel positions during the entrance animation give 43.9999…
  expect(Math.round((await english.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await english.click()
  await expect(headline).toHaveText(HEADLINE.en)
  await expect(english).toHaveAttribute('aria-pressed', 'true')

  await page.waitForTimeout(6000)
  await expect(headline).toHaveText(HEADLINE.en)
})

test('"Sign in" opens the sign-in screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByLabel('Email address')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Sign In' })).toBeChecked()
})

test('logo, hero image and overlay text come from the saved settings', async ({ page }) => {
  await page.route('**/uploads/*.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL_PNG }),
  )
  await seedSettings(page, 'landing', {
    brand: { logoUrl: '/uploads/logo.png', name: 'Acme English', tagline: 'Talk more.' },
    hero: { imageUrl: '/uploads/hero.png', imageAlt: 'Friends chatting' },
    overlay: { headline: 'Speak with confidence', headlineLang: 'en' },
    cta: { primaryLabel: 'Start now' },
  })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Speak with confidence' })).toBeVisible()
  await expect(page.getByText('Acme English')).toBeVisible()
  await expect(page.getByText('Talk more.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Friends chatting' })).toHaveAttribute(
    'src',
    '/uploads/hero.png',
  )
  await expect(page.locator('img[src="/uploads/logo.png"]')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start now' })).toBeVisible()
})

test('stays usable when the hero image fails to load', async ({ page }) => {
  await page.route('**/uploads/missing.png', (route) => route.abort())
  await seedSettings(page, 'landing', { hero: { imageUrl: '/uploads/missing.png' } })
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeInViewport({ ratio: 1 })
  await expect(page.locator('img[src="/uploads/missing.png"]')).toHaveCount(0)
})
