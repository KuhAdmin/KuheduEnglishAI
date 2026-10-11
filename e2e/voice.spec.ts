import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalScroll, seedSettings, spoken, stubSpeech } from './helpers'

const SAMPLE = 'Hello! Let’s practise speaking English together.'
const setVoice = { name: 'Set as tutor voice' }

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
  await stubSpeech(page)
  await page.goto('/profile')

  // The row names the voice of the learner's tutor: for the male tutor, the default man's voice.
  const row = page.getByRole('link', { name: /Voice settings/ })
  await expect(row).toContainText('Michael')
  await row.click()
  await expect(page).toHaveURL(/\/profile\/voice$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Voice settings')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expect(
    tutors(page).getByRole('radio', { name: 'Male tutor Michael', exact: true }),
  ).toBeChecked()
  await expect(tutors(page).getByRole('radio', { name: 'Female tutor Heart' })).not.toBeChecked()
  await expect(
    voices(page).getByRole('radio', { name: 'Michael Default English (United States)' }),
  ).toBeChecked()
  await expect(page.getByRole('button', setVoice)).toBeDisabled()
  await expect(page.getByRole('button', setVoice)).toBeInViewport({ ratio: 1 })
  await expectNoHorizontalScroll(page)

  // The female tutor: hearing a voice does not choose it.
  await tutors(page).getByText('Female tutor').click()
  await expect(kinds(page).getByRole('radio', { name: 'Female' })).toBeChecked()
  await page.getByRole('button', { name: 'Play a sample: Emma' }).click()
  await expect.poll(() => spoken(page)).toEqual([{ text: SAMPLE, voice: 'bf_emma' }])
  await expect(page.getByRole('button', setVoice)).toBeDisabled()

  await voices(page).getByText('Emma', { exact: true }).click()
  await page.getByRole('button', setVoice).click()
  await expect(page.getByText('Female tutor: Emma is now the voice for English.')).toBeVisible()
  // The male tutor keeps his.
  await expect(
    tutors(page).getByRole('radio', { name: 'Male tutor Michael', exact: true }),
  ).toBeVisible()
  expect(await savedVoices(page)).toEqual({ en: { female: 'bf_emma' } })

  await page.reload()
  await expect(tutors(page).getByRole('radio', { name: 'Female tutor Emma' })).toBeVisible()

  // Lessons speak with the voice of the learner's tutor, the male one until they choose her;
  // the second speaker of a conversation has the other tutor's voice.
  await page.goto('/lessons/weeks/1/days/1')
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect
    .poll(async () => (await spoken(page)).slice(0, 2))
    .toEqual([
      { text: 'Hello! Good morning.', voice: 'am_michael' },
      { text: 'Good morning! How are you?', voice: 'bf_emma' },
    ])

  await page.goto('/profile/tutor')
  await page.getByText('Female tutor').click()
  await expect(page.getByText('Voice: Emma')).toBeVisible()
  await page.goto('/profile')
  await expect(page.getByRole('link', { name: /Voice settings/ })).toContainText('Emma')

  await page.goto('/lessons/weeks/1/days/1')
  await page.getByRole('button', { name: 'Play the conversation' }).click()
  await expect
    .poll(async () => (await spoken(page)).at(0))
    .toEqual({ text: 'Hello! Good morning.', voice: 'bf_emma' })
})

test('each language has its own voices, and its own sample', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/profile/voice')

  await page.getByRole('combobox', { name: 'Language' }).selectOption('hi')
  await expect(
    voices(page).getByRole('radio', { name: 'Omega Default Hindi (India)' }),
  ).toBeChecked()
  await page.getByRole('button', { name: 'Play a sample: Omega' }).click()
  await expect
    .poll(() => spoken(page))
    .toEqual([
      { text: 'नमस्ते! आइए, साथ मिलकर अंग्रेज़ी बोलने का अभ्यास करें।', voice: 'hm_omega' },
    ])

  // Bengali is said by the same speakers, but its voices are its own, and so is its sample.
  await page.getByRole('combobox', { name: 'Language' }).selectOption('bn')
  await expect(voices(page).getByRole('radio', { name: /^Omega Default/ })).toBeChecked()
  await page.getByRole('button', { name: 'Play a sample: Omega' }).click()
  await expect
    .poll(async () => (await spoken(page)).at(-1))
    .toEqual({ text: 'নমস্কার! চলুন, একসঙ্গে ইংরেজি বলা অনুশীলন করি।', voice: 'bn_omega' })
})

test('a language the server cannot speak yet says so instead of showing an empty list', async ({
  page,
}) => {
  await stubSpeech(page)
  // One an admin added: the server speaks the built-in languages only.
  await seedSettings(page, 'languages', {
    defaultCode: 'ta',
    languages: [{ code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil' }],
  })
  await page.goto('/profile/voice')

  await page.getByRole('combobox', { name: 'Language' }).selectOption('ta')
  await expect(page.getByText('There are no voices for தமிழ் yet.')).toBeVisible()
  await expect(page.getByRole('button', setVoice)).toHaveCount(0)
})

test('any voice can be given to either tutor, whatever its kind or accent', async ({ page }) => {
  await stubSpeech(page)
  await page.goto('/profile/voice')

  await tutors(page).getByText('Female tutor').click()
  // Every voice says what it is, so there are two kinds and no third.
  await expect(kinds(page).getByRole('radio')).toHaveCount(2)
  await kinds(page).getByText('Male', { exact: true }).click()
  await voices(page).getByText('George', { exact: true }).click()
  await page.getByRole('button', setVoice).click()
  await expect(page.getByText('Female tutor: George is now the voice for English.')).toBeVisible()
  // What is saved is the voice's own id, not its name, and for that tutor only.
  expect(await savedVoices(page)).toEqual({ en: { female: 'bm_george' } })
})

test('a learner whose voices cannot be loaded is told so', async ({ page }) => {
  await stubSpeech(page, 'unreachable')
  await page.goto('/profile/voice')

  await expect(
    page.getByText(
      'The voices cannot be loaded right now. Check your connection, then open this screen again.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('button', setVoice)).toHaveCount(0)
})
