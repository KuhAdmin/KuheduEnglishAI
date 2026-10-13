import type { Page } from '@playwright/test'
import {
  expect,
  LEARNER,
  learnerServer,
  learnerSession,
  nothingKept,
  seedDaysDone,
  seedLanguage,
  signedInAs,
  test,
} from './helpers'

/** What this browser holds of the lessons, as the app stored it. */
const daysDoneHere = (page: Page) =>
  page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('kuhedu-lessons') ?? 'null') as {
      state?: { doneDays?: Record<string, number[]> }
    } | null
    return stored?.state?.doneDays ?? {}
  })

const look = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme)

test('what a learner chose and did follows their account to another browser', async ({
  baseURL,
  page,
  browser,
}) => {
  const kept = nothingKept()
  // A browser from before accounts kept anything: Bengali, two days of Week 1 done.
  await seedLanguage(page, 'bn')
  await seedDaysDone(page, 1, [1, 2])
  await learnerServer(page.context(), kept)

  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
  // What it held is now the account's.
  await expect.poll(() => kept.profile.language).toBe('bn')
  await expect
    .poll(() =>
      kept.marks
        .filter((mark) => mark.kind === 'day')
        .map((mark) => mark.ref)
        .sort(),
    )
    .toEqual(['1', '2'])

  // The same account on a phone that has never seen them.
  const other = await browser.newContext({ baseURL })
  await signedInAs(other, LEARNER)
  await learnerServer(other, kept)
  const second = await other.newPage()
  await second.goto('/')

  // Home, not onboarding: how far they got came with the account. And in their language.
  await expect(second).toHaveURL(/\/home$/)
  await expect(second.locator('html')).toHaveAttribute('lang', 'bn')
  expect(await daysDoneHere(second)).toEqual({ 1: [1, 2] })
  await other.close()
})

test('signing out leaves the browser with nothing of theirs', async ({ page }) => {
  const kept = nothingKept()
  kept.profile = { theme: 'midnight-iris', tutorAvatar: 'female' }
  kept.marks = [{ week: 1, kind: 'day', ref: '1' }]
  await learnerSession(page.context())
  await learnerServer(page.context(), kept)

  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
  await expect.poll(() => look(page)).toBe('midnight-iris')
  expect(await daysDoneHere(page)).toEqual({ 1: [1] })

  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Sign out' }).click()

  // Back to how the app looks for anybody, and nothing done.
  await expect.poll(() => look(page)).not.toBe('midnight-iris')
  expect(await daysDoneHere(page)).toEqual({})
  // And it is still the account's, for the next time they sign in.
  expect(kept.profile.theme).toBe('midnight-iris')
  expect(kept.marks).toHaveLength(1)

  // The app's front door is now the page for someone without an account.
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible()
})
