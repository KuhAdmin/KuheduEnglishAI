import type { Page } from '@playwright/test'
import {
  expect,
  LEARNER,
  seedAboutThem,
  seedDaysDone,
  seedLanguage,
  signedInAs,
  test,
} from './helpers'

// The landing page is for someone without an account. It is also the address the installed app
// opens at, so a learner who is signed in is sent on from it to where they left off.

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const getStarted = (page: Page) => page.getByRole('link', { name: 'Get Started' })

const admin = { ...LEARNER, id: 'u-2', email: 'admin@example.com', role: 'admin' }

test('a first visit is the landing page, and so is a visit by someone who only chose a language', async ({
  page,
}) => {
  await signedInAs(page, null)
  await page.goto('/')
  await expect(getStarted(page)).toBeVisible()

  // Choosing a language is done on this page: it is not yet a beginning.
  await page.getByText('हिन्दी', { exact: true }).click()
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(getStarted(page)).toBeVisible()
  await expect(page.getByRole('radio', { name: 'हिन्दी' })).toBeChecked()
})

test('someone who is not signed in gets the landing page whatever this browser holds, and no learner screen', async ({
  page,
}) => {
  await signedInAs(page, null)
  await seedDaysDone(page, 1, [1])
  await page.goto('/')
  await expect(page).toHaveURL(/\/$/)
  await expect(getStarted(page)).toBeVisible()

  // There are no guests: the journey is behind the account screen.
  await page.goto('/home')
  await expect(page).toHaveURL(/\/sign-in$/)

  // Signed in, what they had done here is where they go on from.
  await signedInAs(page, LEARNER)
  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
})

test('a sign-up whose code was never entered is led to the code step from every learner screen', async ({
  page,
}) => {
  await signedInAs(page, { ...LEARNER, emailVerified: false })
  for (const address of ['/', '/home', '/onboarding', '/profile']) {
    await page.goto(address)
    await expect(page).toHaveURL(/\/verify-email$/)
  }
})

test('a learner who stopped during onboarding opens the app on the step after the last one they answered', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/language$/)
  await page.getByText('English', { exact: true }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/profile$/)

  // Left before saying anything about themselves: nothing has begun, so onboarding from its start.
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/language$/)

  await page.goto('/onboarding/profile')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/onboarding\/placement$/)

  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/placement$/)
  await expect(heading(page)).toHaveText('Let’s find your starting point')
})

test('a learner in the middle of the placement test opens the app on the test', async ({
  page,
}) => {
  await seedLanguage(page, 'en')
  await seedAboutThem(page)
  await page.goto('/placement-test')
  await expect(heading(page)).toBeVisible()

  // Opened and not begun, there is no test to come back to: the step that leads to it instead.
  await page.goto('/')
  await expect(page).toHaveURL(/\/onboarding\/placement$/)

  await page.goto('/placement-test')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(heading(page)).not.toHaveText('First, let’s listen')

  // Begun: the app opens on the test, which offers to carry on.
  await page.goto('/')
  await expect(page).toHaveURL(/\/placement-test$/)
  await expect(heading(page)).toHaveText('Welcome back!')
})

test('a learner with nothing of theirs on this phone opens the app in onboarding', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/onboarding\/language$/)
})

test('a learner who has begun here opens the app on their journey, named in Profile', async ({
  page,
}) => {
  await seedDaysDone(page, 1, [1, 2])
  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
  await expect(heading(page)).toHaveText('Your 50-week journey')

  await page.getByRole('link', { name: 'Profile' }).click()
  const account = page.getByRole('link', { name: /Account/ })
  await expect(account).toContainText(LEARNER.email)
  expect(Math.round((await account.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await account.click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByText(`You are signed in as ${LEARNER.email}.`)).toBeVisible()

  // "Continue" is the front door again, which knows where they were; and so is Back.
  await page.getByRole('link', { name: 'Continue' }).click()
  await expect(page).toHaveURL(/\/home$/)
})

test('the app opens without the server for a learner who was signed in here, and for nobody else', async ({
  page,
}) => {
  await seedDaysDone(page, 1, [1])
  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)

  // The next time, the server cannot be reached: what this browser holds is still theirs.
  await page.route('**/api/auth/session', (route) => route.abort())
  await page.goto('/')
  await expect(page).toHaveURL(/\/home$/)
  await page.goto('/lessons/weeks/1/days/2')
  await expect(heading(page)).toHaveText('Learn useful words')

  // A browser nobody was signed in on gets no further than the landing page.
  await page.evaluate(() => localStorage.removeItem('kuhedu-signed-in'))
  await page.goto('/home')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('an admin still sees the landing page, which is theirs to edit', async ({ page }) => {
  await signedInAs(page, admin)
  await page.goto('/')

  await expect(page).toHaveURL(/\/$/)
  await expect(getStarted(page)).toBeVisible()
})

test('the landing page is not held back by a server that does not say who is signed in', async ({
  page,
}) => {
  // Never answered: the page shows itself after its wait.
  await page.route('**/api/auth/session', () => {})
  await page.goto('/')

  await expect(getStarted(page)).toBeVisible({ timeout: 6000 })
})
