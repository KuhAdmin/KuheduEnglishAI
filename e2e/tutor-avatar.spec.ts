import { expect, test } from '@playwright/test'
import {
  expectNoHorizontalScroll,
  seedLanguage,
  spoken,
  stubSpeech,
  type FakeVoice,
} from './helpers'

const RAVI = 'Microsoft Ravi - English (India)'
const HEERA = 'Microsoft Heera - English (India)'
// The device's best voice is a man's; it has a woman's too.
const VOICES: FakeVoice[] = [
  { name: RAVI, lang: 'en-IN', localService: true, voiceURI: RAVI },
  { name: HEERA, lang: 'en-IN', localService: true, voiceURI: HEERA },
]

const SAMPLE = 'Hello! Let’s practise speaking English together.'
// "Male tutor" is also the end of "Female tutor", so it is asked for exactly.

test('the tutor’s face is chosen on Profile, tried out, and kept', async ({ page }) => {
  await stubSpeech(page, 'works', VOICES)
  await page.goto('/profile')

  // The row names the face in use, and opens the screen that changes it.
  await page.getByRole('link', { name: 'Tutor avatar Male tutor' }).click()
  await expect(page).toHaveURL(/\/profile\/tutor$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tutor avatar')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Male tutor', exact: true })).toBeChecked()
  await expect(page.getByRole('img', { name: 'Male tutor', exact: true })).toBeVisible()
  await expect(page.getByText('Voice: Ravi')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Play a sample' })).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  // Chosen on the tap, and shown at once.
  await page.getByText('Female tutor').click()
  await expect(page.getByRole('radio', { name: 'Female tutor' })).toBeChecked()
  const tutor = page.locator('[data-mood]', {
    has: page.getByRole('img', { name: 'Female tutor' }),
  })
  await expect(tutor).toHaveAttribute('data-mood', 'smile')
  // A woman's face is given the device's woman's voice, not its best one.
  await expect(page.getByText('Voice: Heera')).toBeVisible()

  // The play check: the sample is said, then the tutor gives a thumbs up for a moment.
  await page.getByRole('button', { name: 'Play a sample' }).click()
  await expect.poll(() => spoken(page)).toEqual([{ text: SAMPLE, voice: HEERA }])
  await expect(tutor).toHaveAttribute('data-mood', 'encourage')
  await expect(tutor.locator('[data-part="thumbs-up"]')).toHaveAttribute('data-shown', 'true')
  await expect(tutor).toHaveAttribute('data-mood', 'smile')

  await page.reload()
  await expect(page.getByRole('radio', { name: 'Female tutor' })).toBeChecked()
  await page.getByRole('link', { name: 'Back to your profile' }).click()
  await expect(page.getByRole('link', { name: 'Tutor avatar Female tutor' })).toBeVisible()
})

test('the tutor’s screen is in the learner’s language, and leads to the voice', async ({
  page,
}) => {
  await seedLanguage(page, 'bn')
  await stubSpeech(page)
  await page.goto('/profile/tutor')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('টিউটরের অ্যাভাটার')
  await expect(page.getByRole('radio', { name: 'পুরুষ টিউটর' })).toBeChecked()
  // What the tutor says stays English: it is what is being learned.
  await expect(page.getByText(SAMPLE)).toHaveAttribute('lang', 'en')

  await page.getByRole('link', { name: 'ভয়েস সেটিংস' }).click()
  await expect(page).toHaveURL(/\/profile\/voice$/)
})

test('a device that cannot read aloud is told the lips will not move', async ({ page }) => {
  await stubSpeech(page, 'fails')
  await page.goto('/profile/tutor')

  await page.getByRole('button', { name: 'Play a sample' }).click()
  await expect(
    page.getByText('This device cannot read aloud, so the tutor’s lips will not move.'),
  ).toBeVisible()
})
