import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalScroll, spoken, stubSpeech, type FakeVoice } from './helpers'

const HEERA = 'Microsoft Heera - English (India)'
const RAVI = 'Microsoft Ravi - English (India)'
const ZIRA = 'Microsoft Zira - English (United States)'
const HINDI = 'Google हिन्दी'

// A desktop-like device: its voices are named after people, so their gender can be told.
const NAMED_VOICES: FakeVoice[] = [
  { name: HEERA, lang: 'en-IN', localService: true, voiceURI: HEERA },
  { name: RAVI, lang: 'en-IN', localService: true, voiceURI: RAVI },
  { name: ZIRA, lang: 'en-US', localService: true, voiceURI: ZIRA },
  { name: HINDI, lang: 'hi-IN', localService: false, voiceURI: HINDI },
]

// A phone-like device: its voices are named after their language, and nothing more.
const UNNAMED_VOICES: FakeVoice[] = [
  { name: 'English India', lang: 'en_IN', localService: true, voiceURI: 'en-in-x-ene-local' },
  { name: 'English United States', lang: 'en_US', localService: true, voiceURI: 'en-us-x-tpf' },
]

const SAMPLE = 'Hello! Let’s practise speaking English together.'
const setVoice = { name: 'Set as my voice' }

/**
 * The two tiles that say whose voice is being chosen, the tabs of kinds, and the list.
 * "Male tutor" is also the end of "Female tutor", so his tile is asked for exactly.
 */
const tutors = (page: Page) => page.getByRole('group', { name: 'Voice for' })
const kinds = (page: Page) => page.getByRole('group', { name: 'Kind of voice' })
const voices = (page: Page) => page.getByRole('group', { name: 'Voices' })
const savedVoices = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('kuhedu-voice') ?? '{}').state.voices)

test('each tutor is given a voice, which is heard, kept, and used by the lessons', async ({
  page,
}) => {
  await stubSpeech(page, 'works', NAMED_VOICES)
  await page.goto('/profile')

  // The row names the voice of the learner's tutor: for the male tutor, the first man's voice.
  const row = page.getByRole('link', { name: /Voice settings/ })
  await expect(row).toContainText('Ravi')
  await row.click()
  await expect(page).toHaveURL(/\/profile\/voice$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Voice settings')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expect(
    tutors(page).getByRole('radio', { name: 'Male tutor Ravi', exact: true }),
  ).toBeChecked()
  await expect(tutors(page).getByRole('radio', { name: 'Female tutor Heera' })).not.toBeChecked()
  await expect(
    voices(page).getByRole('radio', { name: 'Ravi Default English (India)' }),
  ).toBeChecked()
  await expect(page.getByRole('button', setVoice)).toBeDisabled()
  await expect(page.getByRole('button', setVoice)).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  // The female tutor: hearing a voice does not choose it.
  await tutors(page).getByText('Female tutor').click()
  await expect(kinds(page).getByRole('radio', { name: 'Female' })).toBeChecked()
  await page.getByRole('button', { name: 'Play a sample: Zira' }).click()
  await expect.poll(() => spoken(page)).toEqual([{ text: SAMPLE, voice: ZIRA }])
  await expect(page.getByRole('button', setVoice)).toBeDisabled()

  await voices(page).getByText('Zira', { exact: true }).click()
  await page.getByRole('button', setVoice).click()
  await expect(page.getByText('Female tutor: Zira is now the voice for English.')).toBeVisible()
  // The male tutor keeps his.
  await expect(
    tutors(page).getByRole('radio', { name: 'Male tutor Ravi', exact: true }),
  ).toBeVisible()
  expect(await savedVoices(page)).toEqual({ en: { female: ZIRA } })

  await page.reload()
  await expect(tutors(page).getByRole('radio', { name: 'Female tutor Zira' })).toBeVisible()

  // Lessons speak with the voice of the learner's tutor: the male one until they choose her.
  await page.goto('/lessons/weeks/1/days/1')
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect
    .poll(async () => (await spoken(page)).at(0))
    .toEqual({ text: 'Hello! Good morning.', voice: RAVI })

  await page.goto('/profile/tutor')
  await page.getByText('Female tutor').click()
  await expect(page.getByText('Voice: Zira')).toBeVisible()
  await page.goto('/profile')
  await expect(page.getByRole('link', { name: /Voice settings/ })).toContainText('Zira')

  await page.goto('/lessons/weeks/1/days/1')
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect
    .poll(async () => (await spoken(page)).at(0))
    .toEqual({ text: 'Hello! Good morning.', voice: ZIRA })
})

test('each language has its own voices, and its own sample', async ({ page }) => {
  await stubSpeech(page, 'works', NAMED_VOICES)
  await page.goto('/profile/voice')

  await page.getByRole('combobox', { name: 'Language' }).selectOption('hi')
  await expect(voices(page).getByRole('radio')).toHaveCount(1)
  await expect(
    voices(page).getByRole('radio', { name: /^Google हिन्दी .* Needs internet$/ }),
  ).toBeChecked()
  await page.getByRole('button', { name: `Play a sample: ${HINDI}` }).click()
  await expect
    .poll(() => spoken(page))
    .toEqual([{ text: 'नमस्ते! आइए, साथ मिलकर अंग्रेज़ी बोलने का अभ्यास करें।', voice: HINDI }])

  // This device has no Bengali voice, and says so instead of showing an empty list.
  await page.getByRole('combobox', { name: 'Language' }).selectOption('bn')
  await expect(page.getByText(/This device has no voice for বাংলা\./)).toBeVisible()
  await expect(page.getByRole('button', setVoice)).toHaveCount(0)
})

test('voices that do not say what they are can still be given to either tutor', async ({
  page,
}) => {
  await stubSpeech(page, 'works', UNNAMED_VOICES)
  await page.goto('/profile/voice')

  // With no voice of his kind, the male tutor has the device's best.
  await expect(
    tutors(page).getByRole('radio', { name: 'Male tutor English India', exact: true }),
  ).toBeChecked()
  await expect(voices(page).getByRole('radio', { name: /^English India Default/ })).toBeChecked()
  await expect(
    page.getByText('This device does not say whether these voices are male or female.'),
  ).toBeVisible()
  // One kind only, so there is nothing to switch between.
  await expect(kinds(page)).toHaveCount(0)

  await tutors(page).getByText('Female tutor').click()
  await voices(page).getByText('English United States', { exact: true }).click()
  await page.getByRole('button', setVoice).click()
  await expect(
    page.getByText('Female tutor: English United States is now the voice for English.'),
  ).toBeVisible()
  // What is saved is the voice's own id, not its name, and for that tutor only.
  expect(await savedVoices(page)).toEqual({ en: { female: 'en-us-x-tpf' } })
})

test('a device that cannot read aloud is told so', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true })
    Reflect.deleteProperty(window, 'speechSynthesis')
  })
  await page.goto('/profile/voice')

  await expect(
    page.getByText('This device cannot read aloud, so there are no voices to choose.'),
  ).toBeVisible()
  await expect(page.getByRole('button', setVoice)).toHaveCount(0)
})
