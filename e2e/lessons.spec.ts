import { expect, test, type Page } from '@playwright/test'
import {
  expectNoHorizontalScroll,
  seedLanguage,
  seedSettings,
  signInAsAdmin,
  stubSpeech,
} from './helpers'

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const conversation = (page: Page) =>
  page.getByRole('list', { name: 'Conversation' }).getByRole('listitem')
const next = (page: Page) => page.getByRole('button', { name: 'Next' })

test('Week 1, Day 1: listen to the conversation, then Next opens', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/home/weeks/1')
  await page.getByRole('link', { name: 'Start Day 1' }).click()

  await expect(page).toHaveURL(/\/lessons\/weeks\/1\/days\/1$/)
  await expect(heading(page)).toHaveText('Watch and listen')
  await expect(page.getByText('See how the conversation flows.')).toBeVisible()
  await expect(page.getByText('1/6')).toBeVisible()
  await expect(conversation(page)).toHaveCount(9)
  await expect(conversation(page).first()).toContainText('Asha')
  await expect(conversation(page).first()).toContainText('Hello! Good morning.')
  // A screen of its own, like the week's overview.
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  // Locked until heard, and it says why.
  await expect(next(page)).toBeDisabled()
  await expect(next(page)).toBeInViewport({ ratio: 1 })
  await expect(page.getByText('Listen to the conversation once to continue.')).toBeVisible()

  const play = page.getByRole('button', { name: 'Play the conversation' })
  const playBox = await play.boundingBox()
  expect(Math.round(playBox?.height ?? 0)).toBeGreaterThanOrEqual(48)
  for (const replay of await page.getByRole('button', { name: /^Listen to this line/ }).all()) {
    const box = await replay.boundingBox()
    expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44)
    expect(Math.round(box?.width ?? 0)).toBeGreaterThanOrEqual(44)
  }

  // Hearing one line again is not hearing the conversation.
  await page.getByRole('button', { name: 'Listen to this line: Hello! Good morning.' }).click()
  await expect(next(page)).toBeDisabled()

  await play.click()
  await expect(next(page)).toBeEnabled()
  await expect(page.getByText('Listen to the conversation once to continue.')).toHaveCount(0)

  await next(page).click()
  await expect(heading(page)).toHaveText('More of this day is coming soon')
  await page.getByRole('link', { name: 'Back to the week' }).click()
  await expect(page).toHaveURL(/\/home\/weeks\/1$/)

  // Coming back, the conversation already heard is not locked again.
  await page.getByRole('link', { name: 'Start Day 1' }).click()
  await expect(next(page)).toBeEnabled()
  await page.reload()
  await expect(next(page)).toBeEnabled()
})

test('a device that cannot speak does not trap the learner', async ({ page }) => {
  await stubSpeech(page, 'fails')
  await page.goto('/lessons/weeks/1/days/1')
  await expect(next(page)).toBeDisabled()

  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'This device cannot play the conversation. Read it below, then continue.',
  )
  await expect(next(page)).toBeEnabled()
})

test('a Bengali learner reads the transcript with the translation under each line', async ({
  page,
}) => {
  await stubSpeech(page)
  await seedLanguage(page, 'bn')
  await page.goto('/lessons/weeks/1/days/1')

  await expect(heading(page)).toHaveText('দেখুন ও শুনুন')
  await expect(page.getByText('১/৬')).toBeVisible()
  const lines = page.getByRole('list', { name: 'কথোপকথন' }).getByRole('listitem')
  await expect(lines.first()).toContainText('Hello! Good morning.')
  await expect(lines.first()).not.toContainText('সুপ্রভাত')

  await page.getByText('লিখিত রূপ').click()
  await expect(lines.first()).toContainText('Hello! Good morning.')
  await expect(lines.first()).toContainText('হ্যালো! সুপ্রভাত।')
  await expect(lines.getByRole('button')).toHaveCount(0)
  await expectNoHorizontalScroll(page)

  await page.getByText('সংলাপ').click()
  await expect(lines.getByRole('button')).toHaveCount(9)
})

const withVideo = {
  1: {
    videoUrl: '/media/week1.mp4',
    lines: [{ speaker: 'Asha', text: 'Hello!', translations: {} }],
  },
}

test('a video linked by the admin takes the place of the picture and the voice', async ({
  page,
}) => {
  await seedSettings(page, 'week-dialogues', withVideo)
  await stubSpeech(page)
  // Held open: there is no real video file to serve, and the player must not report an error.
  await page.route('**/media/week1.mp4', () => {})
  await page.goto('/lessons/weeks/1/days/1')

  const video = page.locator('video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', '/media/week1.mp4')
  await expect(video).toHaveJSProperty('controls', true)
  await expect(page.getByRole('button', { name: 'Play the conversation' })).toHaveCount(0)
  await expect(conversation(page)).toHaveText(['AshaHello!'])
  await expect(next(page)).toBeDisabled()
  await expectNoHorizontalScroll(page)
})

test('a video that cannot be loaded gives way to the picture and the voice', async ({ page }) => {
  await seedSettings(page, 'week-dialogues', withVideo)
  await stubSpeech(page)
  await page.route('**/media/week1.mp4', (route) => route.abort())
  await page.goto('/lessons/weeks/1/days/1')

  await expect(page.getByRole('button', { name: 'Play the conversation' })).toBeVisible()
  await expect(page.locator('video')).toHaveCount(0)
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(next(page)).toBeEnabled()
})

test('a conversation written by the admin opens that week’s Day 1, without a reload', async ({
  context,
  page: adminTab,
}) => {
  await stubSpeech(context)
  await signInAsAdmin(adminTab)
  await adminTab.goto('/admin/lessons')
  await expect(adminTab.getByRole('heading', { level: 1 })).toHaveText('Lessons')

  const learnerTab = await context.newPage()
  await learnerTab.goto('/lessons/weeks/2/days/1')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 1')
  await expect(learnerTab.getByText('This day’s lessons are coming soon.')).toBeVisible()

  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('2')
  await adminTab.getByRole('button', { name: 'Add line' }).click()
  await expect(adminTab.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await adminTab.getByRole('textbox', { name: 'Speaker (Line 1)' }).fill('Meera')
  await adminTab.getByRole('textbox', { name: 'English (Line 1)' }).fill('Where are you from?')
  await adminTab.getByRole('textbox', { name: 'বাংলা (Line 1)' }).fill('আপনি কোথা থেকে এসেছেন?')
  await adminTab.getByRole('button', { name: 'Add line' }).click()
  await adminTab.getByRole('textbox', { name: 'Speaker (Line 2)' }).fill('Arjun')
  await adminTab.getByRole('textbox', { name: 'English (Line 2)' }).fill('I’m from Kolkata.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await expectNoHorizontalScroll(adminTab)

  // The learner's open tab turns into the step.
  await expect(heading(learnerTab)).toHaveText('Watch and listen')
  await expect(conversation(learnerTab)).toHaveText([
    'MeeraWhere are you from?',
    'ArjunI’m from Kolkata.',
  ])
  await learnerTab.getByRole('button', { name: 'Play the conversation' }).click()
  await expect(next(learnerTab)).toBeEnabled()

  // Week 1's built-in conversation can be reworded, and put back.
  await adminTab.getByRole('combobox', { name: 'Week' }).selectOption('1')
  await adminTab.getByRole('textbox', { name: 'English (Line 1)' }).fill('Hi! Good morning.')
  await adminTab.getByRole('button', { name: 'Save changes' }).click()
  await expect(adminTab.getByRole('status')).toContainText('Saved')
  await learnerTab.goto('/lessons/weeks/1/days/1')
  await expect(conversation(learnerTab).first()).toContainText('Hi! Good morning.')

  adminTab.once('dialog', (dialog) => dialog.accept())
  await adminTab.getByRole('button', { name: 'Reset to defaults' }).click()
  await expect(conversation(learnerTab).first()).toContainText('Hello! Good morning.')
  await learnerTab.goto('/lessons/weeks/2/days/1')
  await expect(heading(learnerTab)).toHaveText('Week 2 · Day 1')
})
