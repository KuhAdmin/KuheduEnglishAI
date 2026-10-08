import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { PROFILES_CONFIG_NAME } from '@/shared/lib/appConfig/profilesConfig'
import { parseSettings, settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { CURRICULUM_CONFIG_NAME } from '@/shared/lib/curriculum/curriculumOverrides'
import { WEEK_CHALLENGES_CONFIG_NAME } from '@/shared/lib/curriculum/weekChallenges'
import { WEEK_DIALOGUES_CONFIG_NAME } from '@/shared/lib/curriculum/weekDialogues'
import { WEEK_PICTURES_CONFIG_NAME } from '@/shared/lib/curriculum/weekPictures'
import { WEEK_QUIZZES_CONFIG_NAME } from '@/shared/lib/curriculum/weekQuizzes'
import {
  WEEK_REVIEW_DIALOGUES_CONFIG_NAME,
  WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME,
} from '@/shared/lib/curriculum/weekReviews'
import { WEEK_ROLEPLAYS_CONFIG_NAME } from '@/shared/lib/curriculum/weekRoleplays'
import { WEEK_SCENARIOS_CONFIG_NAME } from '@/shared/lib/curriculum/weekScenarios'
import { WEEK_SENTENCES_CONFIG_NAME } from '@/shared/lib/curriculum/weekSentences'
import { WEEK_VOCABULARY_CONFIG_NAME } from '@/shared/lib/curriculum/weekVocabulary'
import { SCREEN_TEXTS_CONFIG_NAME } from '@/shared/lib/i18n/screenTexts'
import type * as ImageUpload from '../lib/imageUpload'
import { CurriculumPage } from './CurriculumPage'
import { LandingSettingsPage } from './LandingSettingsPage'
import { LanguagesSettingsPage } from './LanguagesSettingsPage'
import { LessonsPage } from './LessonsPage'
import { ProfilesSettingsPage } from './ProfilesSettingsPage'
import { ScreenTextsPage } from './ScreenTextsPage'

// jsdom has no canvas; the resize step itself is covered by fitWithin's tests and by Playwright.
vi.mock('../lib/imageUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof ImageUpload>()),
  fileToStoredImage: vi.fn(async () => 'data:image/webp;base64,UklGRg=='),
}))

const stored = (name: string) =>
  parseSettings(settingsRepository.readRaw(name), {
    safeParse: (value: unknown) => ({ success: true as const, data: value as never }),
  }) as Record<string, never> | undefined

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
const pngFile = () => new File(['x'], 'picture.png', { type: 'image/png' })

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

// This page lists every screen text (290+ fields); finding one by role is slow in jsdom, and
// slower still while the other test files run beside it, so these tests get much more time
// than the default. Real-browser speed is covered by Playwright.
describe('ScreenTextsPage', { timeout: 120_000 }, () => {
  it('lists every text in English first, with nothing to save yet', () => {
    render(<ScreenTextsPage />)

    expect(screen.getByRole('radio', { name: /^English/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /^বাংলা/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Choose your language' })).toHaveValue(
      'Choose your language',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('saves an edited Bengali text and keeps only what changed', async () => {
    render(<ScreenTextsPage />)
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা/ }))

    // The label is the English source; the value is the current Bengali text.
    const field = screen.getByRole('textbox', { name: 'Choose your language' })
    expect(field).toHaveValue('আপনার ভাষা বেছে নিন')
    expect(field).toHaveAttribute('lang', 'bn')

    await userEvent.clear(field)
    await userEvent.type(field, 'ভাষা নির্বাচন করুন')
    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
    await save()

    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      bn: { 'onboarding.language.title': 'ভাষা নির্বাচন করুন' },
    })
    expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('resets one text back to the built-in wording', async () => {
    settingsRepository.write(SCREEN_TEXTS_CONFIG_NAME, { en: { 'home.title': 'Hello there' } })
    render(<ScreenTextsPage />)

    expect(screen.getByRole('textbox', { name: 'Your 50-week journey' })).toHaveValue('Hello there')
    await userEvent.click(
      screen.getByRole('button', { name: 'Reset this text: Your 50-week journey' }),
    )
    expect(screen.getByRole('textbox', { name: 'Your 50-week journey' })).toHaveValue(
      'Your 50-week journey',
    )
    await save()

    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({})
  })

  it('finds texts by searching', async () => {
    render(<ScreenTextsPage />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), 'placement')

    expect(screen.getByRole('textbox', { name: 'Start Placement Test' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Choose your language' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), ' zzz')
    expect(screen.getByText('No texts match your search.')).toBeVisible()
  })

  it('shows only the chosen screen’s texts, together with the language and the search', async () => {
    render(<ScreenTextsPage />)
    const screenPicker = screen.getByRole('combobox', { name: 'Screen' })
    expect(screenPicker).toHaveValue('all')

    await userEvent.selectOptions(screenPicker, 'Sign in and sign up')
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 2, name: 'Sign in and sign up' })).toBeVisible()
    expect(screen.getByText(/replaced by the brand name/)).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Language' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Choose your language' })).not.toBeInTheDocument()

    // The search narrows within that screen …
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search texts' }), 'guest')
    expect(screen.getByRole('textbox', { name: 'Continue as Guest' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Create Account' })).not.toBeInTheDocument()
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search texts' }))

    // … and the language choice still applies.
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা/ }))
    const field = screen.getByRole('textbox', { name: 'Create Account' })
    expect(field).toHaveValue('অ্যাকাউন্ট তৈরি করুন')
    await userEvent.clear(field)
    await userEvent.type(field, 'নতুন অ্যাকাউন্ট')
    await save()
    expect(stored(SCREEN_TEXTS_CONFIG_NAME)).toEqual({
      bn: { 'auth.signUpSubmit': 'নতুন অ্যাকাউন্ট' },
    })

    await userEvent.selectOptions(screenPicker, 'All screens')
    expect(screen.getByRole('textbox', { name: 'Choose your language' })).toBeInTheDocument()
  })

  it('offers languages the admin added and marks their texts as missing', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [{ code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null }],
    })
    render(<ScreenTextsPage />)

    const tamil = screen.getByRole('radio', { name: /^தமிழ் 0\// })
    await userEvent.click(tamil)
    expect(screen.getByRole('textbox', { name: 'Continue' })).toHaveValue('')
    expect(screen.getAllByText('Missing — shows English').length).toBeGreaterThan(10)
  })
})

// A section is 41 text fields; like the screen texts, slow to query in jsdom.
describe('CurriculumPage', { timeout: 30_000 }, () => {
  const sectionPicker = () => screen.getByRole('combobox', { name: 'Section' })

  it('opens on Section 1 in English, with nothing to save yet', () => {
    render(<CurriculumPage />)

    expect(screen.getByRole('radio', { name: /^English 410\/410/ })).toBeChecked()
    expect(sectionPicker()).toHaveValue('1')
    expect(screen.getAllByRole('option')).toHaveLength(10)
    expect(screen.getByRole('option', { name: 'Section 4 · Handle Everyday Interactions' })).toBe(
      screen.getAllByRole('option')[3],
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Section 1' })).toBeVisible()
    expect(screen.getByText('Weeks 1–5')).toBeVisible()
    expect(screen.getByRole('textbox', { name: 'Section name' })).toHaveValue('Start Communicating')
    // The name, then goal, situation, challenge and five outcomes for each of the five weeks.
    expect(screen.getAllByRole('textbox')).toHaveLength(41)
    expect(screen.getByRole('textbox', { name: 'Outcome 5 (Week 1)' })).toHaveValue(
      'Complete a short first meeting',
    )
    expect(screen.getByRole('textbox', { name: 'Goal (Week 1)' })).toHaveValue(
      'I can say hello and introduce myself.',
    )
    expect(screen.getByRole('textbox', { name: 'Situation (Week 5)' })).toHaveValue(
      'Introducing myself at a school, club or workplace event',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('saves edited wording for another section and keeps only what changed', async () => {
    render(<CurriculumPage />)
    await userEvent.selectOptions(sectionPicker(), '4')

    expect(screen.getByRole('heading', { level: 2, name: 'Week 16' })).toBeVisible()
    const name = screen.getByRole('textbox', { name: 'Section name' })
    expect(name).toHaveValue('Handle Everyday Interactions')
    await userEvent.clear(name)
    await userEvent.type(name, 'Everyday Interactions')

    const challenge = screen.getByRole('textbox', { name: 'Challenge (Week 20)' })
    await userEvent.clear(challenge)
    await userEvent.type(challenge, 'Order a drink and pay for it.')
    expect(screen.getByText('You have unsaved changes.')).toBeVisible()
    expect(screen.getAllByText('Edited')).toHaveLength(2)
    await save()

    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({
      en: {
        'section.4': 'Everyday Interactions',
        'week.20.challenge': 'Order a drink and pay for it.',
      },
    })
    expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)
    // The picker names sections as learners now read them.
    expect(screen.getByRole('option', { name: 'Section 4 · Everyday Interactions' })).toBeDefined()
  })

  it('edits Bengali from the English wording, without touching English', async () => {
    render(<CurriculumPage />)
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা 410\/410/ }))

    const goal = screen.getByRole('textbox', { name: 'Goal (Week 1)' })
    expect(goal).toHaveValue('আমি শুভেচ্ছা জানাতে এবং নিজের পরিচয় দিতে পারি।')
    expect(goal).toHaveAttribute('lang', 'bn')
    expect(goal).toHaveAccessibleDescription(
      /^English: I can say hello and introduce myself\. Built-in$/,
    )

    await userEvent.clear(goal)
    await userEvent.type(goal, 'আমি নিজের পরিচয় দিতে পারি।')
    await save()

    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({
      bn: { 'week.1.goal': 'আমি নিজের পরিচয় দিতে পারি।' },
    })
  })

  it('puts one text back on the built-in wording', async () => {
    settingsRepository.write(CURRICULUM_CONFIG_NAME, {
      en: { 'section.1': 'Say Hello', 'week.1.goal': 'I can greet people.' },
    })
    render(<CurriculumPage />)

    expect(screen.getByRole('textbox', { name: 'Section name' })).toHaveValue('Say Hello')
    expect(
      screen.getByRole('button', { name: 'Reset this text: Situation (Week 1)' }),
    ).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Reset this text: Section name' }))
    expect(screen.getByRole('textbox', { name: 'Section name' })).toHaveValue('Start Communicating')
    await save()

    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({ en: { 'week.1.goal': 'I can greet people.' } })
  })

  it('has nothing to save once an edit is typed back', async () => {
    render(<CurriculumPage />)
    const name = screen.getByRole('textbox', { name: 'Section name' })

    await userEvent.type(name, '!')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    await userEvent.type(name, '{Backspace}')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('shows what a language the admin added is still missing', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [{ code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null }],
    })
    render(<CurriculumPage />)
    await userEvent.click(screen.getByRole('radio', { name: /^தமிழ் 0\/410/ }))

    expect(
      screen.getByRole('option', { name: 'Section 1 · Start Communicating — 41 missing' }),
    ).toBeDefined()
    expect(screen.getAllByText('Missing — shows English')).toHaveLength(41)
    const name = screen.getByRole('textbox', { name: 'Section name' })
    expect(name).toHaveValue('')
    expect(name).toHaveAttribute('placeholder', 'Start Communicating')

    await userEvent.type(name, 'பேசத் தொடங்குவோம்')
    expect(screen.getByRole('radio', { name: /^தமிழ் 1\/410/ })).toBeChecked()
    expect(
      screen.getByRole('option', { name: 'Section 1 · Start Communicating — 40 missing' }),
    ).toBeDefined()
    await save()
    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({ ta: { 'section.1': 'பேசத் தொடங்குவோம்' } })
  })

  it('saves a week’s outcomes and its picture, which is the same in every language', async () => {
    render(<CurriculumPage />)
    await userEvent.selectOptions(sectionPicker(), '4')

    const outcome = screen.getByRole('textbox', { name: 'Outcome 1 (Week 20)' })
    expect(outcome).toHaveValue('Order food and drink')
    await userEvent.clear(outcome)
    await userEvent.type(outcome, 'Order a coffee')
    await userEvent.upload(screen.getByLabelText('Picture: Week 20'), pngFile())
    await screen.findByRole('button', { name: 'Remove image' })
    await save()

    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({
      en: { 'week.20.outcome.1': 'Order a coffee' },
    })
    expect(stored(WEEK_PICTURES_CONFIG_NAME)).toEqual({ 20: 'data:image/webp;base64,UklGRg==' })
    expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)

    // The picture belongs to the week, not to a language.
    await userEvent.click(screen.getByRole('radio', { name: /^বাংলা/ }))
    expect(screen.getByRole('button', { name: 'Remove image' })).toBeVisible()

    await userEvent.click(screen.getByRole('button', { name: 'Remove image' }))
    await save()
    expect(stored(WEEK_PICTURES_CONFIG_NAME)).toEqual({})
    expect(stored(CURRICULUM_CONFIG_NAME)).toEqual({
      en: { 'week.20.outcome.1': 'Order a coffee' },
    })
  })

  it('steps through the sections from the bottom of the page', async () => {
    render(<CurriculumPage />)
    expect(screen.getByRole('button', { name: 'Previous section' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next section' }))
    expect(sectionPicker()).toHaveValue('2')
    expect(sectionPicker()).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Section name' })).toHaveValue('My Everyday World')
    expect(screen.getByRole('heading', { level: 2, name: 'Week 6' })).toBeVisible()

    await userEvent.selectOptions(sectionPicker(), '10')
    expect(screen.getByRole('button', { name: 'Next section' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Previous section' }))
    expect(screen.getByRole('heading', { level: 2, name: 'Section 9' })).toBeVisible()
  })

  it('resets the whole course to the built-in wording after confirmation', async () => {
    settingsRepository.write(CURRICULUM_CONFIG_NAME, { en: { 'section.1': 'Say Hello' } })
    settingsRepository.write(WEEK_PICTURES_CONFIG_NAME, { 1: 'data:image/webp;base64,UklGRg==' })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CurriculumPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(screen.getByRole('textbox', { name: 'Section name' })).toHaveValue('Start Communicating')
    expect(stored(CURRICULUM_CONFIG_NAME)).toBeUndefined()
    expect(stored(WEEK_PICTURES_CONFIG_NAME)).toBeUndefined()
  })
})

describe('LessonsPage', () => {
  const weekPicker = () => screen.getByRole('combobox', { name: 'Week' })
  const lines = () => screen.getAllByRole('listitem')
  const field = (name: string) => screen.getByRole('textbox', { name })
  const dialogues = () =>
    stored(WEEK_DIALOGUES_CONFIG_NAME) as unknown as Record<
      string,
      { videoUrl: string | null; lines: { speaker: string; text: string; translations: object }[] }
    >

  it('opens on Week 1’s built-in conversation, with nothing to save yet', () => {
    render(<LessonsPage />)

    expect(weekPicker()).toHaveValue('1')
    expect(
      screen.getByRole('option', {
        name: 'Week 1 · I can say hello and introduce myself. — 9 lines',
      }),
    ).toBeDefined()
    expect(
      screen.getByRole('option', {
        name: 'Week 2 · I can get to know someone. — no conversation yet',
      }),
    ).toBeDefined()
    expect(
      screen.getByText(/This week’s situation: Meeting someone for the first time\./),
    ).toBeVisible()

    expect(lines()).toHaveLength(9)
    expect(field('Speaker (Line 1)')).toHaveValue('Asha')
    expect(field('English (Line 1)')).toHaveValue('Hello! Good morning.')
    // Bengali is the first learner language, so its translation is the one on show.
    expect(screen.getByRole('radio', { name: 'বাংলা' })).toBeChecked()
    expect(field('বাংলা (Line 1)')).toHaveValue('হ্যালো! সুপ্রভাত।')
    expect(field('বাংলা (Line 1)')).toHaveAttribute('lang', 'bn')
    expect(field('Video link')).toHaveValue('')

    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Use built-in' })).toBeNull()
  })

  it('saves an edited line and its Hindi translation, and can go back to the built-in', async () => {
    render(<LessonsPage />)

    const english = field('English (Line 1)')
    await userEvent.clear(english)
    await userEvent.type(english, 'Hi! Good morning.')
    await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी' }))
    const hindi = field('हिन्दी (Line 1)')
    expect(hindi).toHaveValue('नमस्ते! सुप्रभात।')
    await userEvent.clear(hindi)
    await userEvent.type(hindi, 'हाय! सुप्रभात।')
    await save()

    expect(dialogues()['1']?.lines).toHaveLength(9)
    expect(dialogues()['1']?.lines[0]).toEqual({
      speaker: 'Asha',
      text: 'Hi! Good morning.',
      translations: { bn: 'হ্যালো! সুপ্রভাত।', hi: 'हाय! सुप्रभात।' },
    })
    expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)

    await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
    expect(field('English (Line 1)')).toHaveValue('Hello! Good morning.')
    await save()
    expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toEqual({})
  })

  it('has nothing to save once an edit is typed back', async () => {
    render(<LessonsPage />)

    await userEvent.type(field('English (Line 2)'), '!')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    await userEvent.type(field('English (Line 2)'), '{Backspace}')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('writes a conversation for a week that has none, line by line', async () => {
    render(<LessonsPage />)
    await userEvent.selectOptions(weekPicker(), '2')

    expect(
      screen.getByText('This week has no conversation yet. Add a line to start one.'),
    ).toBeVisible()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Add line' }))
    // An unfinished line blocks saving and says why.
    expect(screen.getByText('Enter who says this.')).toBeVisible()
    expect(screen.getByText('Enter what they say.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    // The only line goes with the conversation, not on its own.
    expect(screen.getByRole('button', { name: 'Remove line 1' })).toBeDisabled()

    await userEvent.type(field('Speaker (Line 1)'), 'Meera')
    await userEvent.type(field('English (Line 1)'), 'Where are you from?')
    await userEvent.click(screen.getByRole('button', { name: 'Add line' }))
    await userEvent.type(field('Speaker (Line 2)'), 'Arjun')
    await userEvent.type(field('English (Line 2)'), 'I’m from Kolkata.')
    await userEvent.type(field('বাংলা (Line 2)'), 'আমি কলকাতা থেকে এসেছি।')
    // Two people take turns: the third line is offered to the first speaker.
    await userEvent.click(screen.getByRole('button', { name: 'Add line' }))
    expect(field('Speaker (Line 3)')).toHaveValue('Meera')
    await userEvent.type(field('English (Line 3)'), 'Nice!')

    await userEvent.click(screen.getByRole('button', { name: 'Move up: line 3' }))
    expect(field('English (Line 2)')).toHaveValue('Nice!')
    await userEvent.click(screen.getByRole('button', { name: 'Remove line 2' }))
    expect(lines()).toHaveLength(2)
    await save()

    expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toEqual({
      2: {
        videoUrl: null,
        lines: [
          { speaker: 'Meera', text: 'Where are you from?', translations: {} },
          {
            speaker: 'Arjun',
            text: 'I’m from Kolkata.',
            translations: { bn: 'আমি কলকাতা থেকে এসেছি।' },
          },
        ],
      },
    })
    expect(
      screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — 2 lines' }),
    ).toBeDefined()

    // A week without a built-in conversation loses it altogether.
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    await save()
    expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toEqual({})
  })

  it('accepts only an https video link', async () => {
    render(<LessonsPage />)

    await userEvent.type(field('Video link'), 'http://example.com/week1.mp4')
    expect(screen.getByText('Use a link that starts with https://')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await userEvent.clear(field('Video link'))
    await userEvent.type(field('Video link'), 'https://cdn.example.com/week1.mp4')
    await save()

    expect(dialogues()['1']?.videoUrl).toBe('https://cdn.example.com/week1.mp4')
    expect(dialogues()['1']?.lines).toHaveLength(9)
  })

  it('will not save while another week’s conversation is unfinished', async () => {
    render(<LessonsPage />)
    await userEvent.selectOptions(weekPicker(), '3')
    await userEvent.click(screen.getByRole('button', { name: 'Add line' }))
    await userEvent.selectOptions(weekPicker(), '1')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Finish or remove what is unfinished in: Week 3, Day 1',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('shows no translation field when English is the only language', () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [{ code: 'en', nativeName: 'English', caption: '', flagUrl: null }],
    })
    render(<LessonsPage />)

    expect(screen.queryByRole('radio', { name: 'বাংলা' })).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(9 * 2 + 1)
  })

  describe('Day 2: the week’s words', () => {
    const openWords = () =>
      userEvent.click(screen.getByRole('radio', { name: 'Day 2 · Learn useful words' }))
    const vocabulary = () =>
      stored(WEEK_VOCABULARY_CONFIG_NAME) as unknown as Record<
        string,
        { words: { word: string; phonetic: string; imageUrl: string | null; meanings: object }[] }
      >

    it('shows Week 1’s built-in words, with nothing to save yet', async () => {
      render(<LessonsPage />)
      expect(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' })).toBeChecked()
      await openWords()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 6 words',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — no words yet' }),
      ).toBeDefined()

      expect(lines()).toHaveLength(6)
      expect(field('Word or phrase (Word 1)')).toHaveValue('hello')
      expect(field('Phonetic spelling (Word 1)')).toHaveValue('/həˈləʊ/')
      expect(field('Meaning: বাংলা (Word 1)')).toHaveValue('হ্যালো')
      expect(field('Meaning: বাংলা (Word 1)')).toHaveAttribute('lang', 'bn')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      // The conversation's fields have made way for the words'.
      expect(screen.queryByRole('textbox', { name: 'Video link' })).toBeNull()
    })

    it('saves an edited word with its meaning and an uploaded picture', async () => {
      render(<LessonsPage />)
      await openWords()

      const word = field('Word or phrase (Word 1)')
      await userEvent.clear(word)
      await userEvent.type(word, 'hi')
      await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी' }))
      const meaning = field('Meaning: हिन्दी (Word 1)')
      expect(meaning).toHaveValue('नमस्ते')
      await userEvent.clear(meaning)
      await userEvent.type(meaning, 'हाय')
      await userEvent.upload(screen.getByLabelText('Picture: Word 1'), pngFile())
      await screen.findByRole('button', { name: 'Remove image' })
      await save()

      expect(vocabulary()['1']?.words).toHaveLength(6)
      expect(vocabulary()['1']?.words[0]).toEqual({
        word: 'hi',
        phonetic: '/həˈləʊ/',
        imageUrl: 'data:image/webp;base64,UklGRg==',
        meanings: { bn: 'হ্যালো', hi: 'हाय' },
      })
      // The conversation was not touched, so nothing was written for it.
      expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
      expect(field('Word or phrase (Word 1)')).toHaveValue('hello')
      await save()
      expect(stored(WEEK_VOCABULARY_CONFIG_NAME)).toEqual({})
    })

    it('writes the words of a week that has none, and refuses a word twice', async () => {
      render(<LessonsPage />)
      await openWords()
      await userEvent.selectOptions(weekPicker(), '2')

      expect(screen.getByText('This week has no words yet. Add a word to start.')).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: 'Add word' }))
      expect(screen.getByText('Enter the word.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove word 1' })).toBeDisabled()

      await userEvent.type(field('Word or phrase (Word 1)'), 'city')
      await userEvent.type(field('Phonetic spelling (Word 1)'), '/ˈsɪti/')
      await userEvent.click(screen.getByRole('button', { name: 'Add word' }))
      await userEvent.type(field('Word or phrase (Word 2)'), 'City')
      expect(screen.getByText('This word is already in the list.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await userEvent.clear(field('Word or phrase (Word 2)'))
      await userEvent.type(field('Word or phrase (Word 2)'), 'work')
      await userEvent.type(field('Meaning: বাংলা (Word 2)'), 'কাজ')
      await userEvent.click(screen.getByRole('button', { name: 'Move up: word 2' }))
      await save()

      expect(stored(WEEK_VOCABULARY_CONFIG_NAME)).toEqual({
        2: {
          words: [
            { word: 'work', phonetic: '', imageUrl: null, meanings: { bn: 'কাজ' } },
            { word: 'city', phonetic: '/ˈsɪti/', imageUrl: null, meanings: {} },
          ],
        },
      })
      expect(
        screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — 2 words' }),
      ).toBeDefined()
    })

    it('saves a day’s words and another day’s conversation together, and says where one is unfinished', async () => {
      render(<LessonsPage />)
      await userEvent.type(field('English (Line 1)'), '!')
      await openWords()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.click(screen.getByRole('button', { name: 'Add word' }))

      // Back on Day 1 of Week 1, the unfinished word of Week 4 still blocks saving.
      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 2',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await openWords()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.type(field('Word or phrase (Word 1)'), 'like')
      await save()

      expect(dialogues()['1']?.lines[0]?.text).toBe('Hello! Good morning.!')
      expect(vocabulary()['4']?.words.map((entry) => entry.word)).toEqual(['like'])
      expect(screen.getByRole('status')).toHaveTextContent(/^Saved/)
    })
  })

  describe('Day 3: the week’s sentences', () => {
    const openSentences = () =>
      userEvent.click(screen.getByRole('radio', { name: 'Day 3 · Translate and speak' }))
    const sentences = () =>
      stored(WEEK_SENTENCES_CONFIG_NAME) as unknown as Record<
        string,
        {
          sentences: {
            english: string
            alsoAccepted: string[]
            translations: Record<string, string>
            tips: Record<string, string[]>
          }[]
        }
      >

    it('shows Week 1’s built-in sentences, with nothing to save yet', async () => {
      render(<LessonsPage />)
      await openSentences()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 5 sentences',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — no sentences yet',
        }),
      ).toBeDefined()

      expect(lines()).toHaveLength(5)
      expect(field('English: the answer (Sentence 1)')).toHaveValue('Hello! Good morning.')
      expect(field('Also accepted (Sentence 1)')).toHaveValue('Hi! Good morning.')
      expect(field('Sentence in বাংলা (Sentence 1)')).toHaveValue('হ্যালো! সুপ্রভাত।')
      expect(field('Sentence in বাংলা (Sentence 1)')).toHaveAttribute('lang', 'bn')
      // One tip per line.
      expect(field('Tips: English (Sentence 1)')).toHaveValue(
        'Say “Good morning” before noon.\n“Hello” works at any time of day.',
      )
      expect(field('Tips: বাংলা (Sentence 1)')).toHaveAttribute('lang', 'bn')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      // The other days' fields have made way.
      expect(screen.queryByRole('textbox', { name: 'Video link' })).toBeNull()
    })

    it('saves more accepted sentences and Hindi tips, and can go back to the built-in', async () => {
      render(<LessonsPage />)
      await openSentences()

      await userEvent.type(
        field('Also accepted (Sentence 2)'),
        'How are you doing?{Enter}How do you do?',
      )
      await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी' }))
      const tips = field('Tips: हिन्दी (Sentence 2)')
      await userEvent.clear(tips)
      // A fourth line is one too many: like a text at its full length, it takes no more.
      await userEvent.type(tips, 'एक{Enter}दो{Enter}तीन{Enter}चार')
      expect(tips).toHaveValue('एक\nदो\nतीनचार')
      await save()

      expect(sentences()['1']?.sentences).toHaveLength(5)
      expect(sentences()['1']?.sentences[1]).toMatchObject({
        english: 'How are you?',
        alsoAccepted: ['How are you doing?', 'How do you do?'],
        translations: { bn: 'আপনি কেমন আছেন?', hi: 'आप कैसे हैं?' },
        tips: { hi: ['एक', 'दो', 'तीनचार'] },
      })
      // The other days were not touched, so nothing was written for them.
      expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toBeUndefined()
      expect(stored(WEEK_VOCABULARY_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
      expect(field('Also accepted (Sentence 2)')).toHaveValue('')
      await save()
      expect(stored(WEEK_SENTENCES_CONFIG_NAME)).toEqual({})
    })

    it('has nothing to save once an edit is typed back', async () => {
      render(<LessonsPage />)
      await openSentences()
      const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

      for (const name of [
        'Also accepted (Sentence 2)',
        'Tips: English (Sentence 1)',
        'Sentence in বাংলা (Sentence 1)',
      ]) {
        await userEvent.type(field(name), '!')
        expect(saveButton(), name).toBeEnabled()
        await userEvent.type(field(name), '{Backspace}')
        expect(saveButton(), name).toBeDisabled()
      }
    })

    it('writes the sentences of a week that has none', async () => {
      render(<LessonsPage />)
      await openSentences()
      await userEvent.selectOptions(weekPicker(), '2')

      expect(
        screen.getByText('This week has no sentences yet. Add a sentence to start.'),
      ).toBeVisible()
      await userEvent.click(screen.getByRole('button', { name: 'Add sentence' }))
      expect(screen.getByText('Enter the sentence in English.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove sentence 1' })).toBeDisabled()

      await userEvent.type(field('English: the answer (Sentence 1)'), 'Where are you from?')
      await userEvent.type(field('Sentence in বাংলা (Sentence 1)'), 'আপনি কোথা থেকে এসেছেন?')
      await userEvent.type(field('Tips: English (Sentence 1)'), 'Start with “Where”.')
      await userEvent.click(screen.getByRole('button', { name: 'Add sentence' }))
      await userEvent.type(field('English: the answer (Sentence 2)'), 'I’m from Kolkata.')
      await userEvent.click(screen.getByRole('button', { name: 'Move up: sentence 2' }))
      await save()

      expect(stored(WEEK_SENTENCES_CONFIG_NAME)).toEqual({
        2: {
          sentences: [
            { english: 'I’m from Kolkata.', alsoAccepted: [], translations: {}, tips: {} },
            {
              english: 'Where are you from?',
              alsoAccepted: [],
              translations: { bn: 'আপনি কোথা থেকে এসেছেন?' },
              tips: { en: ['Start with “Where”.'] },
            },
          ],
        },
      })
      expect(
        screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — 2 sentences' }),
      ).toBeDefined()

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await save()
      expect(stored(WEEK_SENTENCES_CONFIG_NAME)).toEqual({})
    })

    it('will not save while another week’s sentence is unfinished, and says where', async () => {
      render(<LessonsPage />)
      await openSentences()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.click(screen.getByRole('button', { name: 'Add sentence' }))

      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 2 · Learn useful words' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 3',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })
  })

  describe('Day 4: the week’s role-play', () => {
    const openRoleplay = () =>
      userEvent.click(screen.getByRole('radio', { name: 'Day 4 · Role-play' }))
    const roleplays = () =>
      stored(WEEK_ROLEPLAYS_CONFIG_NAME) as unknown as Record<
        string,
        {
          partner: string
          imageUrl: string | null
          turns: { partner: string; reply: string; cues: Record<string, string> }[]
        }
      >

    it('shows Week 1’s built-in role-play, with nothing to save yet', async () => {
      render(<LessonsPage />)
      await openRoleplay()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 5 turns',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — no role-play yet',
        }),
      ).toBeDefined()

      expect(field('Name or role')).toHaveValue('Ravi')
      expect(lines()).toHaveLength(5)
      expect(field('Partner says (Turn 1)')).toHaveValue('Hello! Good morning.')
      expect(field('Suggested reply (Turn 1)')).toHaveValue('Good morning!')
      expect(field('What to say, in বাংলা (Turn 1)')).toHaveValue('তাঁকে সুপ্রভাত জানান।')
      expect(field('What to say, in বাংলা (Turn 1)')).toHaveAttribute('lang', 'bn')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      // The other days' fields have made way.
      expect(screen.queryByRole('textbox', { name: 'Video link' })).toBeNull()
    })

    it('saves a renamed partner, their picture and a Hindi cue, and can go back to the built-in', async () => {
      render(<LessonsPage />)
      await openRoleplay()

      const name = field('Name or role')
      await userEvent.clear(name)
      await userEvent.type(name, 'Meera')
      await userEvent.upload(screen.getByLabelText('Picture of the partner'), pngFile())
      await screen.findByRole('button', { name: 'Remove image' })
      await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी' }))
      const cue = field('What to say, in हिन्दी (Turn 3)')
      expect(cue).toHaveValue('अपना नाम बताएँ।')
      await userEvent.clear(cue)
      await userEvent.type(cue, 'अपना नाम कहें।')
      await save()

      expect(roleplays()['1']).toMatchObject({
        partner: 'Meera',
        imageUrl: 'data:image/webp;base64,UklGRg==',
      })
      expect(roleplays()['1']?.turns).toHaveLength(5)
      expect(roleplays()['1']?.turns[2]).toEqual({
        partner: 'I’m good, thanks. My name is Ravi. What’s your name?',
        reply: 'My name is …',
        cues: { bn: 'নিজের নাম বলুন।', hi: 'अपना नाम कहें।' },
      })
      // The other days were not touched, so nothing was written for them.
      expect(stored(WEEK_SENTENCES_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
      expect(field('Name or role')).toHaveValue('Ravi')
      await save()
      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toEqual({})
    })

    it('has nothing to save once an edit is typed back', async () => {
      render(<LessonsPage />)
      await openRoleplay()
      const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

      for (const name of [
        'Name or role',
        'Suggested reply (Turn 2)',
        'What to say, in বাংলা (Turn 1)',
      ]) {
        await userEvent.type(field(name), '!')
        expect(saveButton(), name).toBeEnabled()
        await userEvent.type(field(name), '{Backspace}')
        expect(saveButton(), name).toBeDisabled()
      }
    })

    it('writes the role-play of a week that has none, and says what is still missing', async () => {
      render(<LessonsPage />)
      await openRoleplay()
      await userEvent.selectOptions(weekPicker(), '2')

      expect(
        screen.getByText('This week has no role-play yet. Add a turn to start one.'),
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      // A partner alone is not a role-play.
      await userEvent.type(field('Name or role'), 'the barista')
      expect(screen.getByText('Add what is said: at least one turn.')).toBeVisible()

      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))
      expect(screen.getByText('Enter what the partner says.')).toBeVisible()
      expect(screen.getByText('Enter a reply the learner could give.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove turn 1' })).toBeDisabled()

      await userEvent.type(field('Partner says (Turn 1)'), 'What would you like today?')
      await userEvent.type(field('Suggested reply (Turn 1)'), 'I’d like a coffee, please.')
      await userEvent.type(field('What to say, in বাংলা (Turn 1)'), 'ভদ্রভাবে এক কাপ কফি চান।')
      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))
      await userEvent.type(field('Partner says (Turn 2)'), 'Hi! Welcome!')
      await userEvent.type(field('Suggested reply (Turn 2)'), 'Hello!')
      await userEvent.click(screen.getByRole('button', { name: 'Move up: turn 2' }))
      await save()

      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toEqual({
        2: {
          partner: 'the barista',
          imageUrl: null,
          turns: [
            { partner: 'Hi! Welcome!', reply: 'Hello!', cues: {} },
            {
              partner: 'What would you like today?',
              reply: 'I’d like a coffee, please.',
              cues: { bn: 'ভদ্রভাবে এক কাপ কফি চান।' },
            },
          ],
        },
      })
      expect(
        screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — 2 turns' }),
      ).toBeDefined()

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await save()
      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toEqual({})
    })

    it('will not save while another week’s role-play is unfinished, and says where', async () => {
      render(<LessonsPage />)
      await openRoleplay()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))

      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 4',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })
  })

  describe('Day 5: the week’s challenge', () => {
    const openChallenge = () =>
      userEvent.click(screen.getByRole('radio', { name: 'Day 5 · Challenge' }))
    const challenges = () =>
      stored(WEEK_CHALLENGES_CONFIG_NAME) as unknown as Record<
        string,
        {
          title: { text: string; translations: Record<string, string> }
          instruction: { text: string; translations: Record<string, string> }
          tasks: { text: string; translations: Record<string, string> }[]
          phrases: string[]
        }
      >

    it('shows Week 1’s built-in challenge, with nothing to save yet', async () => {
      render(<LessonsPage />)
      await openChallenge()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 5 tasks',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — no challenge yet',
        }),
      ).toBeDefined()

      expect(field('Name of the challenge')).toHaveValue('First meeting challenge')
      expect(field('Name in বাংলা')).toHaveValue('প্রথম পরিচয়ের চ্যালেঞ্জ')
      expect(field('Name in বাংলা')).toHaveAttribute('lang', 'bn')
      expect(field('Instruction')).toHaveValue(
        'Meet someone new, from hello to goodbye. Try it on your own.',
      )
      expect(lines()).toHaveLength(5)
      expect(field('What to do (Task 1)')).toHaveValue('Greet the person')
      expect(field('In বাংলা (Task 1)')).toHaveValue('শুভেচ্ছা জানান')
      // One phrase per line.
      expect(field('Phrases')).toHaveValue(
        [
          'Hello! Good morning.',
          'How are you?',
          'My name is …',
          'What’s your name?',
          'Nice to meet you.',
          'Goodbye! Have a nice day.',
        ].join('\n'),
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      // The other days' fields have made way.
      expect(screen.queryByRole('textbox', { name: 'Name or role' })).toBeNull()
    })

    it('saves a renamed challenge, a Hindi task and one phrase fewer, and can go back', async () => {
      render(<LessonsPage />)
      await openChallenge()

      const name = field('Name of the challenge')
      await userEvent.clear(name)
      await userEvent.type(name, 'Say hello challenge')
      await userEvent.click(screen.getByRole('radio', { name: 'हिन्दी' }))
      const task = field('In हिन्दी (Task 5)')
      expect(task).toHaveValue('विदा लें')
      await userEvent.clear(task)
      await userEvent.type(task, 'अलविदा कहें')
      await userEvent.clear(field('Phrases'))
      await userEvent.type(field('Phrases'), 'Hello!{Enter}Goodbye!')
      await save()

      expect(challenges()['1']?.title).toEqual({
        text: 'Say hello challenge',
        translations: { bn: 'প্রথম পরিচয়ের চ্যালেঞ্জ', hi: 'पहली मुलाक़ात की चुनौती' },
      })
      expect(challenges()['1']?.tasks).toHaveLength(5)
      expect(challenges()['1']?.tasks[4]).toEqual({
        text: 'Say goodbye',
        translations: { bn: 'বিদায় জানান', hi: 'अलविदा कहें' },
      })
      expect(challenges()['1']?.phrases).toEqual(['Hello!', 'Goodbye!'])
      // The other days were not touched, so nothing was written for them.
      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
      expect(field('Name of the challenge')).toHaveValue('First meeting challenge')
      await save()
      expect(stored(WEEK_CHALLENGES_CONFIG_NAME)).toEqual({})
    })

    it('has nothing to save once an edit is typed back', async () => {
      render(<LessonsPage />)
      await openChallenge()
      const saveButton = () => screen.getByRole('button', { name: 'Save changes' })

      for (const name of [
        'Name of the challenge',
        'Instruction in বাংলা',
        'In বাংলা (Task 2)',
        'Phrases',
      ]) {
        await userEvent.type(field(name), '!')
        expect(saveButton(), name).toBeEnabled()
        await userEvent.type(field(name), '{Backspace}')
        expect(saveButton(), name).toBeDisabled()
      }
    })

    it('writes the challenge of a week that has none, and says what is still missing', async () => {
      render(<LessonsPage />)
      await openChallenge()
      await userEvent.selectOptions(weekPicker(), '2')

      expect(
        screen.getByText('This week has no challenge yet. Add a task to start one.'),
      ).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      // A name alone is not a challenge.
      await userEvent.type(field('Name of the challenge'), 'Café challenge')
      expect(screen.getByText('Add what to do: at least one task.')).toBeVisible()

      await userEvent.click(screen.getByRole('button', { name: 'Add task' }))
      expect(screen.getByText('Enter what to do.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Remove task 1' })).toBeDisabled()

      await userEvent.type(field('What to do (Task 1)'), 'Order food and drink')
      await userEvent.type(field('In বাংলা (Task 1)'), 'খাবার ও পানীয় অর্ডার করুন')
      await userEvent.click(screen.getByRole('button', { name: 'Add task' }))
      await userEvent.type(field('What to do (Task 2)'), 'Greet the staff')
      await userEvent.click(screen.getByRole('button', { name: 'Move up: task 2' }))
      await userEvent.type(field('Instruction'), 'Place your full order.')
      await save()

      expect(stored(WEEK_CHALLENGES_CONFIG_NAME)).toEqual({
        2: {
          title: { text: 'Café challenge', translations: {} },
          instruction: { text: 'Place your full order.', translations: {} },
          tasks: [
            { text: 'Greet the staff', translations: {} },
            {
              text: 'Order food and drink',
              translations: { bn: 'খাবার ও পানীয় অর্ডার করুন' },
            },
          ],
          phrases: [],
        },
      })
      expect(
        screen.getByRole('option', { name: 'Week 2 · I can get to know someone. — 2 tasks' }),
      ).toBeDefined()

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await save()
      expect(stored(WEEK_CHALLENGES_CONFIG_NAME)).toEqual({})
    })

    it('will not save while another week’s challenge is unfinished, and says where', async () => {
      render(<LessonsPage />)
      await openChallenge()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 5',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })
  })

  describe('Day 6: the week’s review', () => {
    const openReview = () => userEvent.click(screen.getByRole('radio', { name: 'Day 6 · Review' }))
    const openPart = (name: string) => userEvent.click(screen.getByRole('radio', { name }))
    const quizzes = () =>
      stored(WEEK_QUIZZES_CONFIG_NAME) as unknown as Record<
        string,
        {
          questions: {
            question: { text: string; translations: Record<string, string> }
            answer: string
            others: string[]
          }[]
        }
      >

    it('shows Week 1’s built-in quiz first, with nothing to save yet', async () => {
      render(<LessonsPage />)
      await openReview()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 3 of 3 review parts',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — no review yet',
        }),
      ).toBeDefined()

      // The words and the challenge it repeats are written under their own days.
      expect(screen.getByText(/“Speaking practice” is Day 5’s challenge/)).toBeVisible()
      expect(screen.getByRole('radio', { name: 'Quick quiz' })).toBeChecked()
      expect(lines()).toHaveLength(5)
      expect(field('What is asked (Question 1)')).toHaveValue(
        'It is morning. How do you greet someone?',
      )
      expect(field('In বাংলা (Question 1)')).toHaveValue('এখন সকাল। কাউকে কীভাবে শুভেচ্ছা জানাবেন?')
      expect(field('In বাংলা (Question 1)')).toHaveAttribute('lang', 'bn')
      expect(field('Right answer (Question 1)')).toHaveValue('Good morning.')
      // One choice per line.
      expect(field('Other choices (Question 1)')).toHaveValue('Goodbye.\nThank you.')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    it('shows the review’s own conversation and role-play in the editors of Days 1 and 4', async () => {
      render(<LessonsPage />)
      await openReview()

      await openPart('Listening practice')
      expect(lines()).toHaveLength(9)
      expect(field('Speaker (Line 1)')).toHaveValue('Meera')
      expect(field('English (Line 1)')).toHaveValue('Hi! Good afternoon.')
      expect(screen.queryByRole('textbox', { name: 'Right answer (Question 1)' })).toBeNull()

      await openPart('Mini role-play')
      expect(field('Name or role')).toHaveValue('Meera')
      expect(lines()).toHaveLength(4)
      expect(field('Partner says (Turn 1)')).toHaveValue('Hi! Good afternoon.')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    it('saves a quiz written for another week, and removes it again', async () => {
      render(<LessonsPage />)
      await openReview()
      await userEvent.selectOptions(weekPicker(), '2')
      expect(
        screen.getByText('This week has no quiz yet. Add a question to start one.'),
      ).toBeVisible()

      await userEvent.click(screen.getByRole('button', { name: 'Add question' }))
      await userEvent.type(field('What is asked (Question 1)'), 'How do you order a coffee?')
      await userEvent.type(field('In বাংলা (Question 1)'), 'কফি কীভাবে চাইবেন?')
      await userEvent.type(field('Right answer (Question 1)'), 'A coffee, please.')
      await userEvent.type(field('Other choices (Question 1)'), 'Goodbye.{Enter}Thank you.')
      await save()

      expect(quizzes()).toEqual({
        2: {
          questions: [
            {
              question: {
                text: 'How do you order a coffee?',
                translations: { bn: 'কফি কীভাবে চাইবেন?' },
              },
              answer: 'A coffee, please.',
              others: ['Goodbye.', 'Thank you.'],
            },
          ],
        },
      })
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — 1 of 3 review parts',
        }),
      ).toBeDefined()
      // Nothing was written into the other days' settings.
      expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await save()
      expect(stored(WEEK_QUIZZES_CONFIG_NAME)).toEqual({})
    })

    it('says what is wrong with a question, and will not save it', async () => {
      render(<LessonsPage />)
      await openReview()

      const others = field('Other choices (Question 1)')
      await userEvent.clear(others)
      expect(screen.getByRole('alert')).toHaveTextContent('Enter at least one other choice.')
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await userEvent.type(others, 'good morning.')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A choice is the same as the right answer, or is listed twice.',
      )

      await userEvent.type(others, '{Enter}Goodbye.')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'A choice is the same as the right answer, or is listed twice.',
      )
      await userEvent.clear(others)
      await userEvent.type(others, 'Goodbye.')
      expect(screen.queryByRole('alert')).toBeNull()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    })

    it('keeps the review’s conversation and role-play apart from those of Days 1 and 4', async () => {
      render(<LessonsPage />)
      await openReview()
      await userEvent.selectOptions(weekPicker(), '2')

      await openPart('Listening practice')
      await userEvent.click(screen.getByRole('button', { name: 'Add line' }))
      await userEvent.type(field('Speaker (Line 1)'), 'Barista')
      await userEvent.type(field('English (Line 1)'), 'What would you like?')

      await openPart('Mini role-play')
      await userEvent.type(field('Name or role'), 'the barista')
      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))
      await userEvent.type(field('Partner says (Turn 1)'), 'Hello!')
      await userEvent.type(field('Suggested reply (Turn 1)'), 'Hi!')
      await save()

      expect(stored(WEEK_REVIEW_DIALOGUES_CONFIG_NAME)).toEqual({
        2: {
          videoUrl: null,
          lines: [{ speaker: 'Barista', text: 'What would you like?', translations: {} }],
        },
      })
      expect(stored(WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME)).toEqual({
        2: {
          partner: 'the barista',
          imageUrl: null,
          turns: [{ partner: 'Hello!', reply: 'Hi!', cues: {} }],
        },
      })
      expect(stored(WEEK_DIALOGUES_CONFIG_NAME)).toBeUndefined()
      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toBeUndefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — 2 of 3 review parts',
        }),
      ).toBeDefined()
    })

    it('will not save while a part out of sight is unfinished, and says which, here and from other days', async () => {
      render(<LessonsPage />)
      await openReview()
      await userEvent.selectOptions(weekPicker(), '4')
      await openPart('Mini role-play')
      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))

      await openPart('Quick quiz')
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Mini role-play',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 6',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })
  })

  describe('Day 7: the real-world challenge', () => {
    const openChallenge = () =>
      userEvent.click(screen.getByRole('radio', { name: 'Day 7 · Real-world challenge' }))
    const scenarioTabs = () =>
      within(screen.getByRole('group', { name: 'Scenario to fill' }))
        .getAllByRole('radio')
        .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)
    const scenarios = () =>
      stored(WEEK_SCENARIOS_CONFIG_NAME) as unknown as Record<
        string,
        {
          scenarios: {
            name: { text: string; translations: Record<string, string> }
            roleplay: { partner: string; imageUrl: string | null; turns: object[] }
          }[]
        }
      >
    /** Everything a scenario needs, written into the one on screen. */
    const fill = async (name: string, partner: string) => {
      await userEvent.type(field('Name of the scenario'), name)
      await userEvent.type(field('Name or role'), partner)
      await userEvent.click(screen.getByRole('button', { name: 'Add turn' }))
      await userEvent.type(field('Partner says (Turn 1)'), 'Hello!')
      await userEvent.type(field('Suggested reply (Turn 1)'), 'Hi!')
    }

    it('shows Week 1’s built-in scenarios one at a time, with nothing to save yet', async () => {
      render(<LessonsPage />)
      await openChallenge()

      expect(
        screen.getByRole('option', {
          name: 'Week 1 · I can say hello and introduce myself. — 3 scenarios',
        }),
      ).toBeDefined()
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — no scenarios yet',
        }),
      ).toBeDefined()

      // The levels are amounts of help, so there is nothing to write for them.
      expect(screen.getByText(/The three levels are not written/)).toBeVisible()
      expect(scenarioTabs()).toEqual([
        '1 · A new neighbour',
        '2 · First day at work',
        '3 · A phone call',
      ])
      expect(screen.getByRole('radio', { name: '1 · A new neighbour' })).toBeChecked()
      expect(field('Name of the scenario')).toHaveValue('A new neighbour')
      expect(field('Name in বাংলা')).toHaveValue('নতুন প্রতিবেশী')
      expect(field('Name in বাংলা')).toHaveAttribute('lang', 'bn')
      // Its role-play, in Day 4's editor.
      expect(field('Name or role')).toHaveValue('Priya')
      expect(lines()).toHaveLength(4)
      expect(field('Partner says (Turn 1)')).toHaveValue('Hello! Good evening.')
      expect(field('What to say, in বাংলা (Turn 1)')).toHaveValue('তাঁকে শুভ সন্ধ্যা জানান।')

      await userEvent.click(screen.getByRole('radio', { name: '3 · A phone call' }))
      expect(field('Name of the scenario')).toHaveValue('A phone call')
      expect(field('Name or role')).toHaveValue('Anita')

      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
      // Three is as many as a week may have.
      expect(screen.getByRole('button', { name: 'Add scenario' })).toBeDisabled()
    })

    it('says what a new scenario still needs, and will not save it', async () => {
      render(<LessonsPage />)
      await openChallenge()
      await userEvent.selectOptions(weekPicker(), '2')
      expect(
        screen.getByText('This week has no scenarios yet. Add a scenario to start.'),
      ).toBeVisible()

      await userEvent.click(screen.getByRole('button', { name: 'Add scenario' }))

      expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual([
        'Enter the name of the scenario.',
        'Enter who the learner talks to.',
        'Add what is said: at least one turn.',
      ])
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })

    it('saves a scenario written for another week, and removes it again', async () => {
      render(<LessonsPage />)
      await openChallenge()
      await userEvent.selectOptions(weekPicker(), '2')
      await userEvent.click(screen.getByRole('button', { name: 'Add scenario' }))
      await fill('Takeaway café', 'the barista')
      await userEvent.type(field('Name in বাংলা'), 'টেকঅ্যাওয়ে ক্যাফে')
      expect(screen.queryByRole('alert')).toBeNull()
      await save()

      expect(scenarios()).toEqual({
        2: {
          scenarios: [
            {
              name: { text: 'Takeaway café', translations: { bn: 'টেকঅ্যাওয়ে ক্যাফে' } },
              roleplay: {
                partner: 'the barista',
                imageUrl: null,
                turns: [{ partner: 'Hello!', reply: 'Hi!', cues: {} }],
              },
            },
          ],
        },
      })
      expect(scenarioTabs()).toEqual(['1 · Takeaway café'])
      expect(
        screen.getByRole('option', {
          name: 'Week 2 · I can get to know someone. — 1 scenarios',
        }),
      ).toBeDefined()
      // Day 4's own role-plays are another settings object.
      expect(stored(WEEK_ROLEPLAYS_CONFIG_NAME)).toBeUndefined()

      await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
      await save()
      expect(stored(WEEK_SCENARIOS_CONFIG_NAME)).toEqual({})
    })

    it('reorders and removes the built-in scenarios, and can go back to them', async () => {
      render(<LessonsPage />)
      await openChallenge()

      await userEvent.click(screen.getByRole('button', { name: 'Move later: scenario 1' }))
      expect(scenarioTabs()).toEqual([
        '1 · First day at work',
        '2 · A new neighbour',
        '3 · A phone call',
      ])
      // The scenario that moved is still the one on screen.
      expect(screen.getByRole('radio', { name: '2 · A new neighbour' })).toBeChecked()
      expect(field('Name or role')).toHaveValue('Priya')

      await userEvent.click(screen.getByRole('button', { name: 'Remove scenario 2' }))
      expect(scenarioTabs()).toEqual(['1 · First day at work', '2 · A phone call'])
      await save()

      expect(scenarios()[1]?.scenarios.map((scenario) => scenario.name.text)).toEqual([
        'First day at work',
        'A phone call',
      ])

      await userEvent.click(screen.getByRole('button', { name: 'Use built-in' }))
      expect(scenarioTabs()).toHaveLength(3)
      await save()
      expect(stored(WEEK_SCENARIOS_CONFIG_NAME)).toEqual({})
    })

    it('will not save while a scenario out of sight is unfinished, and says which, here and from other days', async () => {
      render(<LessonsPage />)
      await openChallenge()
      await userEvent.selectOptions(weekPicker(), '4')
      await userEvent.click(screen.getByRole('button', { name: 'Add scenario' }))
      await fill('Bakery', 'the baker')
      await userEvent.click(screen.getByRole('button', { name: 'Add scenario' }))

      await userEvent.click(screen.getByRole('radio', { name: '1 · Bakery' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: 2 · Scenario',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

      await userEvent.selectOptions(weekPicker(), '1')
      await userEvent.click(screen.getByRole('radio', { name: 'Day 1 · Watch and listen' }))
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Finish or remove what is unfinished in: Week 4, Day 7',
      )
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    })
  })
})

describe('LandingSettingsPage', () => {
  it('saves edited wording and an uploaded logo', async () => {
    render(<LandingSettingsPage />)

    // One headline per language: Bengali, Hindi and English by default.
    expect(screen.getByRole('combobox', { name: 'Language of headline 1' })).toHaveValue('bn')
    expect(screen.getByRole('combobox', { name: 'Language of headline 3' })).toHaveValue('en')
    const headline = screen.getByRole('textbox', { name: 'Headline 3' })
    await userEvent.clear(headline)
    await userEvent.type(headline, 'Speak with confidence')
    await userEvent.upload(screen.getByLabelText('Logo'), pngFile())
    await screen.findByRole('button', { name: 'Use default' })
    await save()

    const landing = stored(LANDING_CONFIG_NAME) as unknown as {
      brand: { logoUrl: string; name: string }
      overlay: { headlines: { lang: string; text: string }[] }
    }
    expect(landing.overlay.headlines).toHaveLength(3)
    expect(landing.overlay.headlines[2]).toMatchObject({
      lang: 'en',
      text: 'Speak with confidence',
    })
    expect(landing.brand.logoUrl).toBe('data:image/webp;base64,UklGRg==')
    expect(landing.brand.name).toBe('Kuhedu English')
  })

  it('adds, reorders and removes headlines', async () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [
        { code: 'bn', nativeName: 'বাংলা' },
        { code: 'hi', nativeName: 'हिन्दी' },
        { code: 'ta', nativeName: 'தமிழ்' },
      ],
    })
    render(<LandingSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add headline' }))
    // The new row suggests a language without a headline yet, and must be filled in.
    expect(screen.getByRole('combobox', { name: 'Language of headline 4' })).toHaveValue('ta')
    expect(screen.getByText('Enter the headline text.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Headline 4' }), 'தமிழ் தலைப்பு')
    await userEvent.click(screen.getByRole('button', { name: 'Move up: headline 4' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 1' }))
    await save()

    const landing = stored(LANDING_CONFIG_NAME) as unknown as {
      overlay: { headlines: { lang: string; text: string }[] }
    }
    expect(landing.overlay.headlines.map((item) => item.lang)).toEqual(['hi', 'ta', 'en'])
    expect(landing.overlay.headlines[1]?.text).toBe('தமிழ் தலைப்பு')
  })

  it('keeps at least one headline', async () => {
    render(<LandingSettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 3' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove headline 2' }))
    expect(screen.getByRole('button', { name: 'Remove headline 1' })).toBeDisabled()
  })

  it('discards unsaved edits', async () => {
    render(<LandingSettingsPage />)

    const name = screen.getByRole('textbox', { name: 'Brand name' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Something else')
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Kuhedu English')
    expect(stored(LANDING_CONFIG_NAME)).toBeUndefined()
  })

  it('resets the section to the built-in defaults after confirmation', async () => {
    settingsRepository.write(LANDING_CONFIG_NAME, { brand: { name: 'Acme English' } })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<LandingSettingsPage />)
    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Acme English')

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))

    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Kuhedu English')
    expect(stored(LANDING_CONFIG_NAME)).toBeUndefined()
  })

  it('keeps the section when the reset is not confirmed', async () => {
    settingsRepository.write(LANDING_CONFIG_NAME, { brand: { name: 'Acme English' } })
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<LandingSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(screen.getByRole('textbox', { name: 'Brand name' })).toHaveValue('Acme English')
  })
})

describe('LanguagesSettingsPage', () => {
  const rows = () => screen.getAllByRole('listitem')

  it('adds a language once its row is complete', async () => {
    render(<LanguagesSettingsPage />)
    expect(rows()).toHaveLength(3)

    await userEvent.click(screen.getByRole('button', { name: 'Add language' }))
    const added = within(rows()[3] as HTMLElement)
    // An unfinished row blocks saving and says why.
    expect(added.getByText('Use a short code such as bn or en-IN.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()

    await userEvent.type(added.getByRole('textbox', { name: 'Language code' }), 'ta')
    await userEvent.type(added.getByRole('textbox', { name: 'Name in its own script' }), 'தமிழ்')
    await userEvent.type(added.getByRole('textbox', { name: /^Note in brackets/ }), 'Tamil')
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as { languages: { code: string }[] }
    expect(saved.languages.map((language) => language.code)).toEqual(['bn', 'hi', 'en', 'ta'])
    expect(saved.languages[3]).toEqual({
      code: 'ta',
      nativeName: 'தமிழ்',
      caption: 'Tamil',
      flagUrl: null,
    })
  })

  it('refuses a duplicate code', async () => {
    render(<LanguagesSettingsPage />)
    const code = within(rows()[1] as HTMLElement).getByRole('textbox', { name: 'Language code' })
    await userEvent.clear(code)
    await userEvent.type(code, 'bn')

    expect(screen.getByText('This code is already used by another language.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('reorders and removes languages, and repairs the pre-selected one', async () => {
    render(<LanguagesSettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Move up: हिन्दी' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove language: বাংলা' }))
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as {
      languages: { code: string }[]
      defaultCode: string
    }
    expect(saved.languages.map((language) => language.code)).toEqual(['hi', 'en'])
    // Bengali was the pre-selected language; with it gone the first one takes over.
    expect(saved.defaultCode).toBe('hi')
  })

  it('saves an uploaded flag', async () => {
    render(<LanguagesSettingsPage />)
    await userEvent.upload(screen.getByLabelText('Flag: English'), pngFile())
    await within(rows()[2] as HTMLElement).findByRole('button', { name: 'Remove image' })
    await save()

    const saved = stored(LANGUAGES_CONFIG_NAME) as unknown as { languages: { flagUrl: string }[] }
    expect(saved.languages[2]?.flagUrl).toBe('data:image/webp;base64,UklGRg==')
  })
})

describe('ProfilesSettingsPage', () => {
  it('saves an uploaded picture and can go back to the bundled one', async () => {
    render(<ProfilesSettingsPage />)

    await userEvent.upload(screen.getByLabelText('Female picture: Adult (18+)'), pngFile())
    const useDefault = await screen.findByRole('button', { name: 'Use default' })
    await save()

    const saved = stored(PROFILES_CONFIG_NAME) as unknown as Record<
      string,
      { maleImageUrl: string; femaleImageUrl: string }
    >
    expect(saved.adult).toEqual({
      maleImageUrl: '/avatars/adult-male.svg',
      femaleImageUrl: 'data:image/webp;base64,UklGRg==',
    })
    expect(saved.child?.maleImageUrl).toBe('/avatars/child-male.svg')

    await userEvent.click(useDefault)
    await save()
    const again = stored(PROFILES_CONFIG_NAME) as unknown as Record<
      string,
      { femaleImageUrl: string }
    >
    expect(again.adult?.femaleImageUrl).toBe('/avatars/adult-female.svg')
  })
})
