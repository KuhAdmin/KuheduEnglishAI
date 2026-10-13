import type { Page } from '@playwright/test'
import {
  expect,
  expectNoHorizontalScroll,
  scrollToEnd,
  seedLanguage,
  serverVoicesWithout,
  spoken,
  stubSpeech,
  test,
  untouchedUntilTapped,
} from './helpers'

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' })
const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const sections = (page: Page) => page.getByRole('list', { name: 'Sections' }).getByRole('link')

test('Home is the 50-week journey: ten sections, the current one marked', async ({ page }) => {
  await page.goto('/home')

  await expect(heading(page)).toHaveText('Your 50-week journey')
  await expect(page.getByText('Real-life communication, step by step.')).toBeVisible()
  await expect(sections(page)).toHaveCount(10)
  await expect(sections(page).first()).toContainText('Start Communicating')
  await expect(sections(page).first()).toContainText('Weeks 1–5')
  await expect(sections(page).first()).toContainText('Current section')
  await expect(sections(page).first()).toHaveAttribute('aria-current', 'step')
  await expect(page.getByText('Current section')).toHaveCount(1)

  // Every section is a comfortable touch target.
  for (const section of await sections(page).all()) {
    expect(Math.round((await section.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(48)
  }
  await expectNoHorizontalScroll(page)

  // Scrolled to the end, the last section sits clear of the navigation.
  const last = sections(page).last()
  await scrollToEnd(last)
  await expect(last).toContainText('Communicate Independently')
  const lastBox = await last.boundingBox()
  const navBox = await nav(page).boundingBox()
  if (!lastBox || !navBox) throw new Error('section or navigation missing')
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(navBox.y)
})

test('a section opens its five weeks, and Back returns to the journey', async ({ page }) => {
  await page.goto('/home')
  await page.getByRole('link', { name: /Handle Everyday Interactions/ }).click()

  await expect(page).toHaveURL(/\/home\/sections\/4$/)
  await expect(heading(page)).toHaveText('Handle Everyday Interactions')
  await expect(page.getByText('Weeks 16–20')).toBeVisible()

  const weeks = page.getByRole('list', { name: 'Weeks' }).getByRole('article')
  await expect(weeks).toHaveCount(5)
  await expect(weeks.first()).toContainText('Week 16')
  await expect(weeks.first()).toContainText('I can start and join a conversation.')
  await expect(weeks.first()).toContainText('Meeting people at a social gathering')
  await expect(weeks.first()).toContainText('Start small talk, show interest and introduce people.')
  await expect(page.getByText('This week')).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // Still under the Home tab.
  await expect(nav(page).getByRole('link', { name: 'Home' })).toHaveAttribute(
    'aria-current',
    'page',
  )

  const back = page.getByRole('link', { name: 'Back to your journey' })
  expect(Math.round((await back.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
  await back.click()
  await expect(page).toHaveURL(/\/home$/)

  // Section 1 holds the week the learner is on.
  await sections(page).first().click()
  await expect(page.getByRole('article').first()).toContainText('This week')
  // Among the weeks; the tutor at the top speaks of this week too.
  await expect(page.getByRole('list', { name: 'Weeks' }).getByText('This week')).toHaveCount(1)
})

test('a week opens its overview, with Start Day 1 in the thumb zone', async ({ page }) => {
  await page.goto('/home/sections/4')
  await page.getByRole('link', { name: 'I can handle everyday transactions.' }).click()

  await expect(page).toHaveURL(/\/home\/weeks\/20$/)
  await expect(heading(page)).toHaveText('Real-life situation')
  await expect(page.getByText('Week 20 of 50')).toBeVisible()
  // The situation is the one on the card that was tapped.
  await expect(page.getByText('Ordering at a café or food counter')).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'What you will be able to do' }).getByRole('listitem'),
  ).toHaveText([
    'Order food and drink',
    'Ask about the menu and price',
    'Make special requests',
    'Respond to a follow-up question',
    'Complete a natural café conversation',
  ])
  // A screen of its own: no bottom navigation competing with its action.
  await expect(nav(page)).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  const start = page.getByRole('link', { name: 'Start Day 1' })
  await expect(start).toBeInViewport({ ratio: 1 })
  const startBox = await start.boundingBox()
  const viewport = page.viewportSize()
  if (!startBox || !viewport) throw new Error('button or viewport missing')
  expect(Math.round(startBox.height)).toBeGreaterThanOrEqual(48)
  expect(startBox.y).toBeGreaterThan((viewport.height * 2) / 3)

  const backBox = await page.getByRole('link', { name: 'Back to the weeks' }).boundingBox()
  expect(Math.round(backBox?.height ?? 0)).toBeGreaterThanOrEqual(44)
  expect(Math.round(backBox?.width ?? 0)).toBeGreaterThanOrEqual(44)
  // The bar for the week's place in the course stands alone: no arrow beside it.
  await expect(page.getByRole('progressbar', { name: 'Your place in the course' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Next week' })).toHaveCount(0)

  await page.goto('/home/weeks/21')
  await expect(page.getByText('Week 21 of 50')).toBeVisible()
  await expect(page.getByText('Ask open questions')).toBeVisible()

  // Week 21 belongs to Section 5, and that is where Back goes.
  await page.getByRole('link', { name: 'Back to the weeks' }).click()
  await expect(page).toHaveURL(/\/home\/sections\/5$/)
  await expect(heading(page)).toHaveText('Sustain Conversations')
})

test('Start Day 1 opens a day that says its lessons are coming, and leads back', async ({
  page,
}) => {
  await page.goto('/home/weeks/20')
  await page.getByRole('link', { name: 'Start Day 1' }).click()

  await expect(page).toHaveURL(/\/lessons\/weeks\/20\/days\/1$/)
  await expect(heading(page)).toHaveText('Week 20 · Day 1')
  await expect(page.getByText('This day’s lessons are coming soon.')).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.getByRole('link', { name: 'Back to the week' }).click()
  await expect(page).toHaveURL(/\/home\/weeks\/20$/)
  await expect(heading(page)).toHaveText('Real-life situation')
})

test('the last week shows the course as complete on its bar', async ({ page }) => {
  await page.goto('/home/weeks/50')
  await expect(page.getByText('Week 50 of 50')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Your place in the course' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  )
})

test('a section, week or day that does not exist is a page that does not exist', async ({
  page,
}) => {
  for (const path of ['/home/sections/11', '/home/weeks/51', '/lessons/weeks/20/days/8']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible()
  }
})

test('the bottom navigation moves between the four main screens and stays in reach', async ({
  page,
}) => {
  await page.goto('/home')
  const tabs = nav(page).getByRole('link')
  await expect(tabs).toHaveText(['Home', 'Learn', 'Progress', 'Profile'])
  await expect(nav(page)).toBeInViewport({ ratio: 1 })
  for (const tab of await tabs.all()) {
    const box = await tab.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(48)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(48)
  }

  // It stays put while the journey scrolls.
  await scrollToEnd(sections(page).last())
  await expect(sections(page).last()).toBeInViewport()
  await expect(nav(page)).toBeInViewport({ ratio: 1 })

  for (const [tab, url, title] of [
    ['Learn', /\/lessons$/, 'Lessons'],
    ['Progress', /\/progress$/, 'Your progress'],
    ['Profile', /\/profile$/, 'My profile'],
    ['Home', /\/home$/, 'Your 50-week journey'],
  ] as const) {
    await nav(page).getByRole('link', { name: tab }).click()
    await expect(page).toHaveURL(url)
    await expect(heading(page)).toHaveText(title)
    await expect(nav(page).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
    await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(1)
    await expect(nav(page)).toBeInViewport({ ratio: 1 })
    await expectNoHorizontalScroll(page)
  }
})

test('screens outside the main tabs have no bottom navigation', async ({ page }) => {
  for (const path of ['/', '/sign-in', '/onboarding/language', '/placement-test', '/practice']) {
    await page.goto(path)
    await expect(heading(page)).toBeVisible()
    await expect(nav(page)).toHaveCount(0)
  }
})

test('the journey is in the learner’s language, digits included', async ({ page }) => {
  await seedLanguage(page, 'bn')
  await page.goto('/home')

  await expect(heading(page)).toHaveText('আপনার ৫০ সপ্তাহের যাত্রা')
  const bengaliNav = page.getByRole('navigation', { name: 'প্রধান নেভিগেশন' })
  await expect(bengaliNav.getByRole('link')).toHaveText(['হোম', 'শিখুন', 'অগ্রগতি', 'প্রোফাইল'])

  const first = page.getByRole('list', { name: 'বিভাগ' }).getByRole('link').first()
  await expect(first).toContainText('কথা বলা শুরু করি')
  await expect(first).toContainText('সপ্তাহ ১–৫')
  await expect(first).toContainText('বর্তমান বিভাগ')
  await expectNoHorizontalScroll(page)

  await first.click()
  await expect(heading(page)).toHaveText('কথা বলা শুরু করি')
  await expect(page.getByRole('article').first()).toContainText('সপ্তাহ ১')
  await expect(page.getByRole('article').first()).toContainText(
    'আমি শুভেচ্ছা জানাতে এবং নিজের পরিচয় দিতে পারি।',
  )
  await expectNoHorizontalScroll(page)

  await page.getByRole('article').first().getByRole('link').click()
  await expect(heading(page)).toHaveText('বাস্তব জীবনের পরিস্থিতি')
  await expect(page.getByText('৫০ সপ্তাহের মধ্যে সপ্তাহ ১')).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'আপনি যা করতে পারবেন' }).getByRole('listitem'),
  ).toHaveCount(5)
  await expect(page.getByRole('link', { name: 'দিন ১ শুরু করুন' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)
})

const tutor = (page: Page) => page.getByRole('region', { name: 'Your tutor' })
const said = async (page: Page) => (await spoken(page)).map((line) => line.text)

test('the tutor keeps its place at the top and says what matters on each journey screen', async ({
  page,
}) => {
  await stubSpeech(page)
  await untouchedUntilTapped(page)
  await page.goto('/home')

  // Written from the start; nothing may sound before the learner has touched the page.
  await expect(tutor(page)).toContainText(
    'You are in Section 1, Start Communicating. Tap it to see your weeks.',
  )
  await expect(tutor(page)).toBeInViewport({ ratio: 1 })
  expect(await said(page)).toEqual([])
  for (const name of ['Hear the tutor again', 'Mute the tutor']) {
    const box = await tutor(page).getByRole('button', { name }).boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }
  await expectNoHorizontalScroll(page)

  // The list scrolls under the tutor: the heading leaves, the tutor stays.
  await scrollToEnd(sections(page).last())
  await expect(heading(page)).not.toBeInViewport()
  await expect(tutor(page)).toBeInViewport({ ratio: 1 })

  // Asked for, it says its line; a screen opened by a tap is told by itself.
  await tutor(page).getByRole('button', { name: 'Hear the tutor again' }).click()
  await expect.poll(() => said(page)).toHaveLength(1)
  await sections(page).first().click()
  await expect(tutor(page)).toContainText(
    'This week is Week 1: Meeting someone for the first time. Tap it to begin.',
  )
  await expect
    .poll(() => said(page))
    .toEqual([
      'You are in Section 1, Start Communicating. Tap it to see your weeks.',
      'This week is Week 1: Meeting someone for the first time. Tap it to begin.',
    ])

  // On a week's overview it stays above the part that scrolls, and names the pinned button.
  await page.getByRole('article').first().getByRole('link').click()
  await expect(tutor(page)).toContainText('Day 1 is next. Tap “Start Day 1” when you are ready.')
  await expect(tutor(page)).toBeInViewport({ ratio: 1 })
  await expect(page.getByRole('link', { name: 'Start Day 1' })).toBeInViewport({ ratio: 1 })
  await expect.poll(() => said(page)).toHaveLength(3)
  await expectNoHorizontalScroll(page)
})

test('a muted tutor stays written and silent, on later screens and after the app is reopened', async ({
  page,
}) => {
  await stubSpeech(page)
  await page.goto('/home')
  await tutor(page).getByRole('button', { name: 'Mute the tutor' }).click()
  await expect(tutor(page).getByRole('button', { name: 'Let the tutor speak' })).toBeVisible()

  await sections(page).first().click()
  await expect(tutor(page)).toContainText('This week is Week 1')
  await page.reload()
  await expect(tutor(page).getByRole('button', { name: 'Let the tutor speak' })).toBeVisible()
  expect(await said(page)).toEqual([])
})

test('a Bengali learner’s tutor says its Bengali line in a Bengali voice', async ({ page }) => {
  await stubSpeech(page)
  await untouchedUntilTapped(page)
  await seedLanguage(page, 'bn')
  await page.goto('/home')

  const bengaliTutor = page.getByRole('region', { name: 'আপনার টিউটর' })
  await page.getByRole('list', { name: 'বিভাগ' }).getByRole('link').first().click()
  await expect(page).toHaveURL(/\/home\/sections\/1$/)
  // In the male tutor's Bengali voice, and what is heard is what is read: the line as written.
  await expect.poll(() => spoken(page)).toHaveLength(1)
  const [heard] = await spoken(page)
  expect(heard?.voice).toBe('bn_omega')
  expect(heard?.text).toBe((await bengaliTutor.locator('p').innerText()).trim())
})

test('a learner whose language the server cannot speak reads the tutor, and hears nothing', async ({
  page,
}) => {
  // The server as it was before it could speak Bengali.
  await stubSpeech(page, 'works', serverVoicesWithout('bn'))
  await seedLanguage(page, 'bn')
  await page.goto('/home')

  const bengaliTutor = page.getByRole('region', { name: 'আপনার টিউটর' })
  await expect(bengaliTutor).toContainText('আপনি এখন বিভাগ ১-এ আছেন: কথা বলা শুরু করি।')
  // Nothing to hear, so nothing to press: what is heard is always what is read, so the line is
  // neither read by the English voice nor said in English.
  await expect(bengaliTutor.getByRole('button')).toHaveCount(0)
  await page.getByRole('list', { name: 'বিভাগ' }).getByRole('link').first().click()
  await expect(bengaliTutor).toContainText('এই সপ্তাহটি হলো সপ্তাহ ১')
  expect(await said(page)).toEqual([])
  // The section's way back is in the tutor's band, and stays there.
  await expect(bengaliTutor.getByRole('link', { name: 'আপনার যাত্রায় ফিরে যান' })).toBeInViewport()
  await expectNoHorizontalScroll(page)
})

test('a Hindi learner’s tutor says its Hindi line in a Hindi voice', async ({ page }) => {
  await stubSpeech(page)
  await untouchedUntilTapped(page)
  await seedLanguage(page, 'hi')
  await page.goto('/home')

  const hindiTutor = page.getByRole('region', { name: 'आपका ट्यूटर' })
  await page.getByRole('list', { name: 'खंड' }).getByRole('link').first().click()
  await expect(page).toHaveURL(/\/home\/sections\/1$/)
  // In the male tutor's Hindi voice, and what is heard is what is read: the line as written.
  await expect.poll(() => spoken(page)).toHaveLength(1)
  const [heard] = await spoken(page)
  expect(heard?.voice).toBe('hm_omega')
  expect(heard?.text).toBe((await hindiTutor.locator('p').innerText()).trim())
})
