import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll, seedLanguage } from './helpers'

test('explains the placement test in Bengali, with all four skills', async ({ page }) => {
  await seedLanguage(page, 'bn')
  await page.goto('/onboarding/placement')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'চলুন, আপনার শুরুর জায়গা খুঁজে নিই',
  )
  await expect(page.getByRole('listitem')).toHaveText([
    'শুনুন',
    'বুঝুন',
    'বলুন',
    'অনুবাদ করুন (প্রয়োজন হলে)',
  ])
  await expect(page.getByText('১০–১৫ মিনিট')).toBeVisible()

  const start = page.getByRole('link', { name: 'প্লেসমেন্ট টেস্ট শুরু করুন' })
  await expect(start).toBeInViewport({ ratio: 1 })
  expect((await start.boundingBox())?.height).toBeGreaterThanOrEqual(44)
  await expectNoHorizontalScroll(page)

  await start.click()
  await expect(page).toHaveURL(/\/placement-test$/)
})

test('leaves out "Translate" for learners who chose English only', async ({ page }) => {
  await seedLanguage(page, 'en')
  await page.goto('/onboarding/placement')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Let’s find your starting point')
  await expect(page.getByRole('listitem')).toHaveText(['Listen', 'Understand', 'Speak'])
  await expect(page.getByText('10–15 minutes')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Start Placement Test' })).toBeVisible()
})

test('the profile step leads to the placement intro', async ({ page }) => {
  await seedLanguage(page, 'en')
  await page.goto('/onboarding/profile')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page).toHaveURL(/\/onboarding\/placement$/)
  await expect(page.getByRole('listitem')).toHaveCount(3)
})
