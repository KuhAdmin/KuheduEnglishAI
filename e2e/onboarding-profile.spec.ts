import { expect, test, type Page } from '@playwright/test'
import { PIXEL_PNG, seedSettings } from './helpers'

/**
 * State of the coin in the first option's avatar. `facing` is the cosine of its turn:
 * 1 = front (male picture) towards the viewer, -1 = back (female picture).
 */
async function firstCoin(page: Page) {
  const pictures = page.locator('fieldset label').first().locator('img')
  // evaluate does not wait for rendering, so make sure both faces are there first.
  await expect(pictures).toHaveCount(2)
  return pictures.first().evaluate((front) => {
    const coin = front.parentElement
    if (!coin) throw new Error('coin not found')
    const style = getComputedStyle(coin)
    const back = coin.querySelectorAll('img')[1]
    return {
      animation: style.animationName,
      preserves3d: style.transformStyle === 'preserve-3d',
      facing: style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).m11,
      facesHideWhenTurnedAway:
        getComputedStyle(front).backfaceVisibility === 'hidden' &&
        !!back &&
        getComputedStyle(back).backfaceVisibility === 'hidden',
    }
  })
}

test('the language step leads to the profile step, which saves the age group', async ({ page }) => {
  await page.goto('/onboarding/language')
  await page.getByText('English only').click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/onboarding\/profile$/)
  await expect(page.getByRole('heading', { name: 'Tell us about yourself' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Adult (18+)' })).toBeChecked()

  // Bundled pictures all load: a male and a female one per age group.
  const pictures = page.locator('fieldset img')
  await expect(pictures).toHaveCount(6)
  for (const picture of await pictures.all()) {
    await expect(picture).toHaveJSProperty('complete', true)
    expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  }

  for (const card of await page.locator('fieldset label').all()) {
    expect((await card.boundingBox())?.height).toBeGreaterThanOrEqual(48)
  }

  await page.getByText('Teenager').click()
  await expect(page.getByRole('radio', { name: 'Teenager (13–18)' })).toBeChecked()

  const next = page.getByRole('button', { name: 'Continue' })
  await expect(next).toBeInViewport({ ratio: 1 })
  await next.click()
  await expect(page).toHaveURL(/\/onboarding\/placement$/)

  await page.goto('/onboarding/profile')
  await expect(page.getByRole('radio', { name: 'Teenager (13–18)' })).toBeChecked()
})

test('each profile picture flips like a coin between the male and female image', async ({
  page,
}) => {
  await page.goto('/onboarding/profile')

  const coin = await firstCoin(page)
  expect(coin.animation).toBe('coin-flip')
  expect(coin.preserves3d).toBe(true)
  expect(coin.facesHideWhenTurnedAway).toBe(true)
  // It starts resting on the front (male) face ...
  expect(coin.facing).toBeGreaterThan(0.99)

  // ... flips over to the back (female) face ...
  await expect
    .poll(async () => (await firstCoin(page)).facing, { timeout: 6000 })
    .toBeLessThan(-0.99)
  // ... and comes back round to the front.
  await expect
    .poll(async () => (await firstCoin(page)).facing, { timeout: 6000 })
    .toBeGreaterThan(0.99)
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('the picture stays still on its front face', async ({ page }) => {
    await page.goto('/onboarding/profile')

    const coin = await firstCoin(page)
    expect(coin.animation).toBe('none')
    expect(coin.facing).toBe(1)
  })
})

test('profile pictures come from the saved settings', async ({ page }) => {
  await page.route('**/uploads/*.png', (route) =>
    route.fulfill({ contentType: 'image/png', body: PIXEL_PNG }),
  )
  await seedSettings(page, 'learner-profiles', {
    adult: { maleImageUrl: '/uploads/man.png', femaleImageUrl: '/uploads/woman.png' },
    child: { maleImageUrl: '/uploads/boy.png' },
  })
  await page.goto('/onboarding/profile')

  await expect(page.locator('img[src="/uploads/man.png"]')).toHaveCount(1)
  await expect(page.locator('img[src="/uploads/woman.png"]')).toHaveCount(1)
  await expect(page.locator('img[src="/uploads/boy.png"]')).toHaveCount(1)
  // Not configured → bundled picture stays.
  await expect(page.locator('img[src="/avatars/child-female.svg"]')).toHaveCount(1)
  await expect(page.locator('img[src="/avatars/teen-male.svg"]')).toHaveCount(1)
})

test('a picture that fails to load does not break the option', async ({ page }) => {
  await page.route('**/uploads/*.png', (route) => route.abort())
  await seedSettings(page, 'learner-profiles', {
    child: { maleImageUrl: '/uploads/a.png', femaleImageUrl: '/uploads/b.png' },
  })
  await page.goto('/onboarding/profile')

  const childCard = page.locator('fieldset label').first()
  await expect(childCard.locator('img')).toHaveCount(0)
  await expect(childCard.locator('svg').first()).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Child (6–12)' })).toBeVisible()
})
