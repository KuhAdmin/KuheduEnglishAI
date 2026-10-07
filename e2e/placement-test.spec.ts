import { expect, test, type Page } from '@playwright/test'
import { itemBank } from '../src/features/placement/data/itemBank'
import { denyMicrophone, expectNoHorizontalScroll, seedLanguage, stubSpeech } from './helpers'

const LEVELS = ['FOUNDATION', 'A1', 'A2', 'B1', 'B2+']

type SavedSession = {
  stage: string
  stageStarted: boolean
  status: string
  currentItemId: string | null
  responses: { itemId: string; skipped: string | null; translationUsed: boolean }[]
  notAssessed: Record<string, string>
}

const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kuhedu-placement') ?? '{}').state)
const session = async (page: Page) => (await saved(page)).session as SavedSession

const heading = (page: Page) => page.getByRole('heading', { level: 1 })
const tap = (page: Page, name: string) => page.getByRole('button', { name, exact: true }).click()

/** Wait until the saved session has moved on from this question. */
const movedOnFrom = (page: Page, itemId: string | null) =>
  expect.poll(async () => (await session(page)).currentItemId).not.toBe(itemId)

type Labels = { play: string; next: string }
const EN: Labels = { play: 'Play', next: 'Continue' }

/** Answer the current stage's choice questions as a learner of this ability would. */
async function answerStage(page: Page, ability: string, labels: Labels = EN) {
  const stage = (await session(page)).stage
  for (;;) {
    const now = await session(page)
    if (now.stage !== stage || !now.stageStarted || now.status === 'COMPLETED') return

    const item = itemBank.find((entry) => entry.id === now.currentItemId)
    if (!item || item.stage === 'SPEAK') throw new Error('expected a choice question')
    if (item.stage === 'LISTEN') await tap(page, labels.play)

    const knows = LEVELS.indexOf(item.level) <= LEVELS.indexOf(ability)
    const option = item.options[knows ? item.answer : (item.answer + 1) % item.options.length]
    await page.getByText(option ?? '', { exact: true }).click()
    await tap(page, labels.next)
    await movedOnFrom(page, item.id)
  }
}

async function recordAnAnswer(page: Page) {
  await tap(page, 'Tap to speak')
  await expect(page.getByRole('status')).toContainText('Recording…')
  await tap(page, 'Stop recording')
  await expect(page.getByRole('status')).toContainText('Got it!')
}

/** From the test's first screen to the introduction of the speaking part. */
async function reachSpeaking(page: Page, ability = 'A1') {
  await page.goto('/placement-test')
  await expect(heading(page)).toHaveText('First, let’s listen')
  await tap(page, 'Continue')
  await answerStage(page, ability)
  await expect(heading(page)).toHaveText('Now, a few questions')
  await tap(page, 'Continue')
  await answerStage(page, ability)
  await expect(heading(page)).toHaveText('Last part: let’s hear you speak')
}

test.beforeEach(async ({ page }) => {
  await stubSpeech(page)
})

test.describe('with a microphone', () => {
  test.skip(({ browserName }) => browserName === 'webkit', 'WebKit has no fake microphone')

  test('a learner goes from the intro through all three parts to a starting point', async ({
    page,
  }) => {
    await page.goto('/onboarding/placement')
    await page.getByRole('link', { name: 'Start Placement Test' }).click()

    await expect(heading(page)).toHaveText('First, let’s listen')
    await expect(page.getByRole('list', { name: 'Test progress' })).toBeVisible()
    await expectNoHorizontalScroll(page)
    await tap(page, 'Continue')

    // A listening question: nothing to choose until it has been heard, and no countdown.
    await expect(heading(page)).toHaveText('Listen and choose the answer')
    await expect(page.getByRole('radio')).toHaveCount(0)
    const play = page.getByRole('button', { name: 'Play', exact: true })
    expect(Math.round((await play.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
    await expect(page.getByText(/remaining|\d:\d\d/)).toHaveCount(0)
    await answerStage(page, 'A1')

    await expect(heading(page)).toHaveText('Now, a few questions')
    await tap(page, 'Continue')
    await expect(heading(page)).toHaveText('Choose the best answer')
    for (const control of [
      page.getByRole('button', { name: 'Continue', exact: true }),
      page.getByRole('button', { name: 'I’m not sure' }),
      page.getByRole('button', { name: 'Pause test' }),
    ]) {
      await expect(control).toBeInViewport({ ratio: 1 })
      expect(Math.round((await control.boundingBox())?.height ?? 0)).toBeGreaterThanOrEqual(44)
    }
    await expectNoHorizontalScroll(page)
    await answerStage(page, 'A1')

    await expect(heading(page)).toHaveText('Last part: let’s hear you speak')
    await expect(
      page.getByText('Your recording stays on this device and is not saved.'),
    ).toBeVisible()
    await tap(page, 'Allow microphone')

    for (const prompt of [
      'Tell me your name.',
      'Where are you from?',
      'Tell me something about yourself.',
    ]) {
      await expect(page.getByText(prompt)).toBeVisible()
      await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
      await recordAnAnswer(page)
      await expectNoHorizontalScroll(page)
      await tap(page, 'Continue')
    }

    await expect(page).toHaveURL(/\/placement-test\/result$/)
    await expect(heading(page)).toHaveText('We’ve found your starting point!')
    await expect(page.getByText('You’re ready to begin at Level A1.')).toBeVisible()
    const start = page.getByRole('link', { name: 'Start My Learning Journey' })
    await expect(start).toBeInViewport({ ratio: 1 })

    await page.getByText('See My Results').click()
    await expect(page.getByText('Not scored yet')).toBeVisible()
    await expectNoHorizontalScroll(page)

    // Nothing of the recordings is kept — only that they were made.
    const { result } = await saved(page)
    expect(result.recommendation.startLevel).toBe('A1')
    expect(result.profile.speakingAttempts).toBe(3)

    // The result is still there after a reload, and leads on to the app.
    await page.reload()
    await expect(page.getByText('You’re ready to begin at Level A1.')).toBeVisible()
    await page.getByRole('link', { name: 'Start My Learning Journey' }).click()
    await expect(page).toHaveURL(/\/home$/)
  })

  test('a recording can be played back and made again', async ({ page }) => {
    await reachSpeaking(page)
    await tap(page, 'Allow microphone')
    await expect(heading(page)).toHaveText('Say it out loud')

    await recordAnAnswer(page)
    await tap(page, 'Listen')
    await tap(page, 'Try again')
    await expect(page.getByRole('status')).toContainText('Recording…')
    await tap(page, 'Stop recording')
    await expect(page.getByRole('status')).toContainText('Got it!')
    await tap(page, 'Continue')

    await expect(page.getByText('Where are you from?')).toBeVisible()
  })
})

test('a blocked microphone can be fixed or left out, and speaking is then not judged', async ({
  page,
}) => {
  await denyMicrophone(page)
  await reachSpeaking(page)

  await tap(page, 'Allow microphone')
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('The microphone is blocked for this app.')
  await expect(alert).toContainText('On Android')
  await expect(page.getByRole('button', { name: 'Check Microphone' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  await tap(page, 'Continue without speaking')

  await expect(heading(page)).toHaveText('We’ve found your starting point!')
  await page.getByText('See My Results').click()
  await expect(page.getByText('Not checked this time')).toBeVisible()
  expect((await saved(page)).result.profile.speaking).toEqual({
    status: 'notAssessed',
    reason: 'microphoneDenied',
  })
})

test('progress survives a reload, and starting again asks first', async ({ page }) => {
  await page.goto('/placement-test')
  await tap(page, 'Continue')
  await tap(page, 'Play')
  const first = await session(page)
  const item = itemBank.find((entry) => entry.id === first.currentItemId)
  if (!item || item.stage !== 'LISTEN') throw new Error('expected a listening question')
  await page.getByText(item.options[item.answer] ?? '', { exact: true }).click()
  await tap(page, 'Continue')
  await movedOnFrom(page, item.id)
  const second = (await session(page)).currentItemId

  await page.reload()
  await expect(heading(page)).toHaveText('Welcome back!')
  await expect(page.getByText('Your placement test is waiting for you.')).toBeVisible()
  await tap(page, 'Continue Test')
  await expect(heading(page)).toHaveText('Listen and choose the answer')
  expect((await session(page)).currentItemId).toBe(second)
  expect((await session(page)).responses).toHaveLength(1)

  await tap(page, 'Pause test')
  await expect(heading(page)).toHaveText('Test paused')
  await tap(page, 'Start Again')
  await expect(page.getByRole('alert')).toContainText('Your answers so far will be cleared.')
  await tap(page, 'Keep my answers')
  expect((await session(page)).responses).toHaveLength(1)

  await tap(page, 'Start Again')
  await tap(page, 'Yes, start again')
  await expect(heading(page)).toHaveText('First, let’s listen')
  expect((await session(page)).responses).toHaveLength(0)
})

test('a Bengali learner can see a question in Bengali, which is noted as help', async ({
  page,
}) => {
  await seedLanguage(page, 'bn')
  await page.goto('/placement-test')
  await expect(heading(page)).toHaveText('প্রথমে, চলুন শুনি')
  await tap(page, 'এগিয়ে যান')
  await expect(heading(page)).toHaveText('শুনুন এবং উত্তর বেছে নিন')

  const now = await session(page)
  const shown = itemBank.find((entry) => entry.id === now.currentItemId)
  if (!shown || shown.stage !== 'LISTEN' || !shown.translations?.bn) {
    throw new Error('expected a listening question with a Bengali help text')
  }

  await tap(page, 'চালান')
  // The Bengali is not on show until the learner asks for it.
  await expect(page.getByText(shown.translations.bn)).toHaveCount(0)
  await tap(page, 'আমি নিশ্চিত নই')
  await tap(page, 'বাংলা ভাষায় দেখুন')
  await expect(page.getByText(shown.translations.bn)).toBeVisible()
  await expectNoHorizontalScroll(page)

  await page.getByText(shown.options[shown.answer] ?? '', { exact: true }).click()
  await tap(page, 'এগিয়ে যান')
  await movedOnFrom(page, shown.id)

  expect((await session(page)).responses[0]).toMatchObject({ translationUsed: true })
})

test.describe('on a device that cannot play audio', () => {
  test.beforeEach(async ({ page }) => {
    await stubSpeech(page, 'fails')
  })

  test('the learner can skip, and listening is left out rather than marked down', async ({
    page,
  }) => {
    await page.goto('/placement-test')
    await tap(page, 'Continue')

    for (let attempt = 0; attempt < 2; attempt++) {
      const before = (await session(page)).currentItemId
      await tap(page, 'Play')
      await expect(page.getByRole('alert')).toHaveText('We couldn’t play the audio.')
      await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible()
      await tap(page, 'Skip')
      if (attempt === 0) await movedOnFrom(page, before)
    }

    await expect(heading(page)).toHaveText('Now, a few questions')
    expect((await session(page)).notAssessed.LISTEN).toBe('audioUnavailable')
  })
})
