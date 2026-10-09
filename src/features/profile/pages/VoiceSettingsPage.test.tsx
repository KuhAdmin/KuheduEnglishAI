import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { VoiceSettingsPage } from './VoiceSettingsPage'

class FakeUtterance {
  voice: { voiceURI: string } | null = null
  lang = ''
  rate = 1
  pitch = 1
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null

  constructor(readonly text: string) {}
}

const voice = (name: string, lang: string, localService = true) => ({
  name,
  lang,
  localService,
  voiceURI: name,
})

const HEERA = 'Microsoft Heera - English (India)'
const RAVI = 'Microsoft Ravi - English (India)'
const UK_MALE = 'Google UK English Male'
const PLAIN = 'English United States'
const HINDI = 'Google हिन्दी'

const deviceVoices = [
  voice(HEERA, 'en-IN'),
  voice(RAVI, 'en-IN'),
  voice(UK_MALE, 'en-GB', false),
  voice(PLAIN, 'en-US'),
  voice(HINDI, 'hi-IN', false),
]

const synth = {
  speak: vi.fn<(utterance: FakeUtterance) => void>(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => deviceVoices),
}
const spoken = () => {
  const utterance = synth.speak.mock.lastCall?.[0]
  if (!utterance) throw new Error('nothing was spoken')
  return utterance
}

function renderVoiceSettings() {
  const router = createMemoryRouter(
    [
      { path: paths.profileVoice, Component: VoiceSettingsPage },
      { path: paths.profile, element: <h1>Profile</h1> },
    ],
    { initialEntries: [paths.profileVoice] },
  )
  return render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
}

/** The two tiles that say whose voice is being chosen; each names the voice that tutor has. */
const tutors = () => within(screen.getByRole('group', { name: 'Voice for' }))
const kinds = () => within(screen.getByRole('group', { name: 'Kind of voice' }))
const voices = () => within(screen.getByRole('group', { name: 'Voices' }))
const setButton = () => screen.getByRole('button', { name: 'Set as my voice' })

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', synth)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('VoiceSettingsPage', () => {
  it('opens on the learner’s own tutor, with each tutor’s voice named', () => {
    renderVoiceSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Voice settings' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
    // Before anything is chosen, each tutor has the device's first voice of their kind.
    expect(tutors().getByRole('radio', { name: 'Male tutor Ravi' })).toBeChecked()
    expect(tutors().getByRole('radio', { name: 'Female tutor Heera' })).not.toBeChecked()

    expect(kinds().getByRole('radio', { name: 'Male' })).toBeChecked()
    expect(voices().getAllByRole('radio')).toHaveLength(2)
    expect(voices().getByRole('radio', { name: 'Ravi Default English (India)' })).toBeChecked()
    // Nothing to save yet, and the button says why.
    expect(setButton()).toBeDisabled()
    expect(screen.getByText('This is this tutor’s voice now.')).toBeVisible()
  })

  it('opens on the female tutor for a learner whose tutor she is', () => {
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderVoiceSettings()

    expect(tutors().getByRole('radio', { name: 'Female tutor Heera' })).toBeChecked()
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(voices().getByRole('radio', { name: 'Heera Default English (India)' })).toBeChecked()
  })

  it('lists the voices by kind, with those the device does not tell apart on their own', async () => {
    renderVoiceSettings()

    // A voice that is not on the device says so.
    expect(
      voices().getByRole('radio', {
        name: 'Google UK English Male English (United Kingdom) · Needs internet',
      }),
    ).not.toBeChecked()

    await userEvent.click(kinds().getByRole('radio', { name: 'Other' }))
    expect(
      voices().getByRole('radio', { name: 'English United States English (United States)' }),
    ).toBeVisible()
    expect(
      screen.getByText('This device does not say whether these voices are male or female.'),
    ).toBeVisible()
    // The tutor's voice is on another tab, so nothing here is selected yet.
    expect(setButton()).toBeDisabled()
    expect(screen.getByText('Choose a voice to set it.')).toBeVisible()
  })

  it('plays a sample in the voice asked for, without choosing it', async () => {
    renderVoiceSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Play a sample: Ravi' }))
    expect(spoken().text).toBe('Hello! Let’s practise speaking English together.')
    expect(spoken().voice?.voiceURI).toBe(RAVI)
    expect(useVoiceStore.getState().voices).toEqual({})

    // While it plays, the same button stops it.
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(synth.cancel).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Play a sample: Ravi' })).toBeVisible()
  })

  it('sets one voice for the male tutor and another for the female', async () => {
    renderVoiceSettings()

    await userEvent.click(voices().getByRole('radio', { name: /^Google UK English Male/ }))
    expect(useVoiceStore.getState().voices).toEqual({})
    await userEvent.click(setButton())

    expect(useVoiceStore.getState().voices).toEqual({ en: { male: UK_MALE } })
    expect(
      screen.getByText('Male tutor: Google UK English Male is now the voice for English.'),
    ).toBeVisible()
    expect(tutors().getByRole('radio', { name: 'Male tutor Google UK English Male' })).toBeChecked()
    expect(setButton()).toBeDisabled()

    // The other tutor: her list opens on her own voice. Any voice can be given to her, even one
    // the device does not call a woman's.
    await userEvent.click(tutors().getByRole('radio', { name: 'Female tutor Heera' }))
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(voices().getByRole('radio', { name: 'Heera Default English (India)' })).toBeChecked()

    await userEvent.click(kinds().getByRole('radio', { name: 'Other' }))
    await userEvent.click(voices().getByRole('radio', { name: /^English United States/ }))
    await userEvent.click(setButton())

    expect(useVoiceStore.getState().voices).toEqual({ en: { male: UK_MALE, female: PLAIN } })
    expect(
      screen.getByText('Female tutor: English United States is now the voice for English.'),
    ).toBeVisible()
    expect(
      tutors().getByRole('radio', { name: 'Female tutor English United States' }),
    ).toBeChecked()
  })

  it('opens on the voices chosen earlier', () => {
    useVoiceStore.setState({ voices: { en: { male: HEERA } } })
    renderVoiceSettings()

    expect(tutors().getByRole('radio', { name: 'Male tutor Heera' })).toBeChecked()
    // The list is on the kind of the voice he was given.
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(voices().getByRole('radio', { name: 'Heera English (India)' })).toBeChecked()
  })

  it('says a sample in the language of the voice, not of the screen', async () => {
    renderVoiceSettings()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'hi')
    const sample = screen.getByText('नमस्ते! आइए, साथ मिलकर अंग्रेज़ी बोलने का अभ्यास करें।')
    expect(sample).toHaveAttribute('lang', 'hi')
    // One kind of voice only, so there is nothing to switch between; both tutors have it.
    expect(screen.queryByRole('group', { name: 'Kind of voice' })).not.toBeInTheDocument()
    expect(tutors().getByRole('radio', { name: `Male tutor ${HINDI}` })).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: `Play a sample: ${HINDI}` }))
    expect(spoken().text).toBe(sample.textContent)
    expect(spoken().voice?.voiceURI).toBe(HINDI)
  })

  it('says so when the device has no voice for a language', async () => {
    renderVoiceSettings()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'bn')
    expect(screen.getByText(/This device has no voice for বাংলা\./)).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Voices' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Voice for' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set as my voice' })).not.toBeInTheDocument()
  })

  it('says so when the device cannot read aloud at all', () => {
    vi.unstubAllGlobals()
    renderVoiceSettings()

    expect(
      screen.getByText('This device cannot read aloud, so there are no voices to choose.'),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Set as my voice' })).not.toBeInTheDocument()
  })
})
