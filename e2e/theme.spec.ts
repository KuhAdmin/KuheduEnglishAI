import { expect, test } from '@playwright/test'

const html = 'html'

test('a chosen theme applies, persists across reloads and carries to other screens', async ({
  page,
}) => {
  await page.goto('/profile')
  await expect(page.getByRole('radio', { name: /Auto/ })).toBeChecked()

  await page.getByText('Sage Dusk').click()
  await expect(page.locator(html)).toHaveAttribute('data-theme', 'sage-dusk')
  await expect(page.locator(html)).toHaveAttribute('data-scheme', 'dark')
  await expect(page.getByRole('radio', { name: 'Sage Dusk' })).toBeChecked()

  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(await background()).toBe('rgb(20, 26, 23)')

  await page.reload()
  await expect(page.locator(html)).toHaveAttribute('data-theme', 'sage-dusk')
  await expect(page.getByRole('radio', { name: 'Sage Dusk' })).toBeChecked()

  await page.goto('/')
  await expect(page.locator(html)).toHaveAttribute('data-theme', 'sage-dusk')
})

test('the saved theme is applied before the app script runs', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'kuhedu-theme-v2',
      JSON.stringify({ state: { preference: 'morning-bliss' }, version: 0 }),
    )
  })
  // Block the app bundle: only the inline boot script in index.html can set the theme.
  await page.route('**/assets/*.js', (route) => route.abort())
  await page.goto('/')
  await expect(page.locator(html)).toHaveAttribute('data-theme', 'morning-bliss')
})

test.describe('Auto', () => {
  test('uses Midnight Iris on a dark system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/profile')
    await expect(page.locator(html)).toHaveAttribute('data-theme', 'midnight-iris')
  })

  test('uses Indigo Dawn on a light system', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/profile')
    await expect(page.locator(html)).toHaveAttribute('data-theme', 'indigo-dawn')
  })
})
