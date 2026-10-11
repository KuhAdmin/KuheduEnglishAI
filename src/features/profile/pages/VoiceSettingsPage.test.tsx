import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { installFakeSound, removeFakeSound, TEST_VOICES, type FakeSound } from '@/test/fakeSound'
import { VoiceSettingsPage } from './VoiceSettingsPage'

let sound: FakeSound

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
const setButton = () => screen.getByRole('button', { name: 'Set as tutor voice' })
const listed = () =>
  voices()
    .getAllByRole('radio')
    .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  sound = installFakeSound()
})

afterEach(() => {
  removeFakeSound()
})

describe('VoiceSettingsPage', () => {
  it('opens on the learner’s own tutor, with each tutor’s voice named', () => {
    renderVoiceSettings()

    expect(screen.getByRole('heading', { level: 1, name: 'Voice settings' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
    // Before anything is chosen, each tutor has the default voice of their kind.
    expect(tutors().getByRole('radio', { name: 'Male tutor Michael' })).toBeChecked()
    expect(tutors().getByRole('radio', { name: 'Female tutor Heart' })).not.toBeChecked()

    expect(kinds().getByRole('radio', { name: 'Male' })).toBeChecked()
    expect(
      voices().getByRole('radio', { name: 'Michael Default English (United States)' }),
    ).toBeChecked()
    // Nothing to save yet, and the button says why.
    expect(setButton()).toBeDisabled()
    expect(screen.getByText('This is this tutor’s voice now.')).toBeVisible()
  })

  it('opens on the female tutor for a learner whose tutor she is', () => {
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderVoiceSettings()

    expect(tutors().getByRole('radio', { name: 'Female tutor Heart' })).toBeChecked()
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(
      voices().getByRole('radio', { name: 'Heart Default English (United States)' }),
    ).toBeChecked()
  })

  it('lists the voices by kind, each with its accent, and knows the kind of every one', async () => {
    renderVoiceSettings()

    expect(listed()).toEqual([
      'Michael Default English (United States)',
      'Fenrir English (United States)',
      'George English (United Kingdom)',
    ])

    await userEvent.click(kinds().getByRole('radio', { name: 'Female' }))
    expect(listed()).toEqual([
      'Heart English (United States)',
      'Bella English (United States)',
      'Emma English (United Kingdom)',
    ])
    // No voice is of unknown kind, so there is no third tab and nothing said about one.
    expect(kinds().getAllByRole('radio')).toHaveLength(2)
    // The tutor's voice is on the other tab, so nothing here is selected yet.
    expect(setButton()).toBeDisabled()
    expect(screen.getByText('Choose a voice to set it.')).toBeVisible()
  })

  it('plays a sample in the voice asked for, without choosing it', async () => {
    renderVoiceSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Play a sample: George' }))
    await waitFor(() =>
      expect(sound.played).toEqual([
        { text: 'Hello! Let’s practise speaking English together.', voice: 'bm_george', rate: 1 },
      ]),
    )
    expect(useVoiceStore.getState().voices).toEqual({})

    // While it plays, the same button stops it.
    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))
    expect(sound.paused()).toBe(true)
    expect(screen.getByRole('button', { name: 'Play a sample: George' })).toBeVisible()
  })

  it('sets one voice for the male tutor and another for the female', async () => {
    renderVoiceSettings()

    await userEvent.click(voices().getByRole('radio', { name: /^George/ }))
    expect(useVoiceStore.getState().voices).toEqual({})
    await userEvent.click(setButton())

    expect(useVoiceStore.getState().voices).toEqual({ en: { male: 'bm_george' } })
    expect(screen.getByText('Male tutor: George is now the voice for English.')).toBeVisible()
    expect(tutors().getByRole('radio', { name: 'Male tutor George' })).toBeChecked()
    expect(setButton()).toBeDisabled()

    // The other tutor: her list opens on her own voice. Any voice can be given to her, a
    // man's included.
    await userEvent.click(tutors().getByRole('radio', { name: 'Female tutor Heart' }))
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(
      voices().getByRole('radio', { name: 'Heart Default English (United States)' }),
    ).toBeChecked()

    await userEvent.click(kinds().getByRole('radio', { name: 'Male' }))
    await userEvent.click(voices().getByRole('radio', { name: /^Fenrir/ }))
    await userEvent.click(setButton())

    expect(useVoiceStore.getState().voices).toEqual({
      en: { male: 'bm_george', female: 'am_fenrir' },
    })
    expect(screen.getByText('Female tutor: Fenrir is now the voice for English.')).toBeVisible()
    expect(tutors().getByRole('radio', { name: 'Female tutor Fenrir' })).toBeChecked()
  })

  it('opens on the voices chosen earlier', () => {
    useVoiceStore.setState({ voices: { en: { male: 'bf_emma' } } })
    renderVoiceSettings()

    expect(tutors().getByRole('radio', { name: 'Male tutor Emma' })).toBeChecked()
    // The list is on the kind of the voice he was given.
    expect(kinds().getByRole('radio', { name: 'Female' })).toBeChecked()
    expect(voices().getByRole('radio', { name: 'Emma English (United Kingdom)' })).toBeChecked()
  })

  it('passes over a voice chosen when the app still spoke with the device’s own', () => {
    useVoiceStore.setState({ voices: { en: { male: 'Microsoft Ravi - English (India)' } } })
    renderVoiceSettings()

    expect(tutors().getByRole('radio', { name: 'Male tutor Michael' })).toBeChecked()
  })

  it('says a sample in the language of the voice, not of the screen', async () => {
    renderVoiceSettings()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'hi')
    const sample = screen.getByText('नमस्ते! आइए, साथ मिलकर अंग्रेज़ी बोलने का अभ्यास करें।')
    expect(sample).toHaveAttribute('lang', 'hi')
    expect(tutors().getByRole('radio', { name: 'Male tutor Omega' })).toBeChecked()
    expect(tutors().getByRole('radio', { name: 'Female tutor Alpha' })).not.toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Play a sample: Omega' }))
    await waitFor(() =>
      expect(sound.played).toEqual([{ text: sample.textContent, voice: 'hm_omega', rate: 1 }]),
    )
  })

  it('offers Bengali its own voices, and says the Bengali sample in the one played', async () => {
    renderVoiceSettings()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'bn')
    const sample = screen.getByText('নমস্কার! চলুন, একসঙ্গে ইংরেজি বলা অনুশীলন করি।')
    expect(sample).toHaveAttribute('lang', 'bn')
    expect(tutors().getByRole('radio', { name: 'Male tutor Omega' })).toBeChecked()
    expect(tutors().getByRole('radio', { name: 'Female tutor Alpha' })).not.toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: 'Play a sample: Omega' }))
    await waitFor(() =>
      expect(sound.played).toEqual([{ text: sample.textContent, voice: 'bn_omega', rate: 1 }]),
    )
  })

  it('says so for a language the server has no voices for yet', async () => {
    // One an admin added: the server speaks the built-in languages only.
    settingsRepository.write(LANGUAGES_CONFIG_NAME, {
      defaultCode: 'ta',
      languages: [{ code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null }],
    })
    renderVoiceSettings()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Language' }), 'ta')
    expect(screen.getByText('There are no voices for தமிழ் yet.')).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Voices' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Voice for' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set as tutor voice' })).not.toBeInTheDocument()
  })

  it('fills in on a first visit, once the server’s voices arrive', async () => {
    removeFakeSound()
    sound = installFakeSound(TEST_VOICES, { known: false })
    renderVoiceSettings()

    // Nothing is called missing while the answer is on its way.
    expect(screen.queryByText(/cannot be loaded/)).not.toBeInTheDocument()
    expect(await screen.findByRole('group', { name: 'Voices' })).toBeVisible()
    expect(tutors().getByRole('radio', { name: 'Male tutor Michael' })).toBeChecked()
  })

  it('says so when the voices cannot be loaded, and offers nothing to set', async () => {
    removeFakeSound()
    sound = installFakeSound([], { known: false })
    sound.serverUp(false)
    renderVoiceSettings()

    expect(
      await screen.findByText(
        'The voices cannot be loaded right now. Check your connection, then open this screen again.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Set as tutor voice' })).not.toBeInTheDocument()
  })
})
