import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { PROFILES_CONFIG_NAME } from '@/shared/lib/appConfig/profilesConfig'
import { parseSettings, settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { CURRICULUM_CONFIG_NAME } from '@/shared/lib/curriculum/curriculumOverrides'
import { WEEK_DIALOGUES_CONFIG_NAME } from '@/shared/lib/curriculum/weekDialogues'
import { WEEK_PICTURES_CONFIG_NAME } from '@/shared/lib/curriculum/weekPictures'
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

// This page lists every screen text (170+ fields); finding one by role is slow in jsdom, and
// slower still while the other test files run beside it, so these tests get much more time
// than the default. Real-browser speed is covered by Playwright.
describe('ScreenTextsPage', { timeout: 60_000 }, () => {
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
      'Finish or remove the conversation of week 3',
    )
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('shows no translation field when English is the only language', () => {
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      languages: [{ code: 'en', nativeName: 'English', caption: '', flagUrl: null }],
    })
    render(<LessonsPage />)

    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(9 * 2 + 1)
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
