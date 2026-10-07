import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, signInAsAdmin } from './helpers'

const routes = [
  '/',
  '/sign-in',
  '/sign-up',
  '/onboarding',
  '/onboarding/language',
  '/onboarding/profile',
  '/onboarding/placement',
  '/placement-test',
  '/home',
  '/practice',
  '/lessons',
  '/profile',
]

for (const route of routes) {
  test(`${route} renders without horizontal scroll`, async ({ page }) => {
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
}

for (const route of ['/admin/texts', '/admin/landing', '/admin/languages', '/admin/profiles']) {
  test(`${route} renders without horizontal scroll`, async ({ page }) => {
    await signInAsAdmin(page)
    await page.goto(route)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })
}

test('unknown routes show the not-found screen', async ({ page }) => {
  await page.goto('/does-not-exist')
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
})

test('serves a valid web app manifest', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(3)
})
