import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSpeech } from '@/shared/lib/audio/speech'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { TutorAvatarPage } from './TutorAvatarPage'

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

const RAVI = 'Microsoft Ravi - English (India)'
const HEERA = 'Microsoft Heera - English (India)'
const ZIRA = 'Microsoft Zira - English (India)'
const voice = (name: string) => ({ name, lang: 'en-IN', localService: true, voiceURI: name })

let deviceVoices: ReturnType<typeof voice>[] = []
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

function renderTutorAvatar() {
  const router = createMemoryRouter(
    [
      { path: paths.profileTutor, Component: TutorAvatarPage },
      { path: paths.profileVoice, element: <h1>Voice settings screen</h1> },
      { path: paths.profile, element: <h1>Profile</h1> },
    ],
    { initialEntries: [paths.profileTutor] },
  )
  return render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
}

/** The big picture of the tutor: its mouth and mood are on the element around the drawing. */
const tutor = (name: string) => {
  const frame = screen.getByRole('img', { name }).parentElement
  if (!frame) throw new Error('the tutor is not drawn')
  return frame
}
const play = () => screen.getByRole('button', { name: 'Play a sample' })
/** Does something that ends the sample, and lets the screen hear of it. */
const settle = (end: () => void) =>
  act(async () => {
    end()
    await vi.advanceTimersByTimeAsync(0)
  })

beforeEach(() => {
  deviceVoices = []
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.useFakeTimers()
})

afterEach(() => {
  cancelSpeech()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('TutorAvatarPage', () => {
  it('shows the tutor smiling, with the default face chosen', () => {
    renderTutorAvatar()

    expect(screen.getByRole('heading', { level: 1, name: 'Tutor avatar' })).toBeVisible()
    expect(screen.getByRole('radio', { name: 'Male tutor' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Female tutor' })).not.toBeChecked()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'smile')
    expect(tutor('Male tutor')).toHaveAttribute('data-mouth', 'rest')
    // Nothing is saved by looking.
    expect(useTutorAvatarStore.getState().avatar).toBeNull()
  })

  it('saves another face on the tap and shows it at once', () => {
    renderTutorAvatar()

    fireEvent.click(screen.getByRole('radio', { name: 'Female tutor' }))

    expect(useTutorAvatarStore.getState().avatar).toBe('female')
    expect(screen.getByRole('radio', { name: 'Female tutor' })).toBeChecked()
    expect(tutor('Female tutor')).toBeVisible()
    expect(screen.queryByRole('img', { name: 'Male tutor' })).not.toBeInTheDocument()
  })

  it('plays a sample: the lips move while it is said, then the tutor gives a thumbs up', async () => {
    renderTutorAvatar()

    fireEvent.click(play())
    expect(spoken().text).toBe('Hello! Let’s practise speaking English together.')
    expect(screen.getByText(spoken().text)).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'neutral')

    act(() => spoken().onstart?.())
    const shapes = new Set<string | null>()
    for (let frame = 0; frame < 6; frame += 1) {
      shapes.add(tutor('Male tutor').getAttribute('data-mouth'))
      act(() => vi.advanceTimersByTime(85))
    }
    expect(shapes.size).toBeGreaterThan(2)

    // Said to the end: a thumbs up for a moment, then back to the smile.
    await settle(() => spoken().onend?.())
    expect(tutor('Male tutor')).toHaveAttribute('data-mouth', 'rest')
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'encourage')
    expect(play()).toBeVisible()

    act(() => vi.advanceTimersByTime(2500))
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'smile')
  })

  it('stops a sample that is playing, without the thumbs up', async () => {
    renderTutorAvatar()

    fireEvent.click(play())
    act(() => spoken().onstart?.())
    await settle(() => fireEvent.click(screen.getByRole('button', { name: 'Stop' })))

    expect(synth.cancel).toHaveBeenCalled()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'smile')
    expect(tutor('Male tutor')).toHaveAttribute('data-mouth', 'rest')
    expect(play()).toBeVisible()
  })

  it('says so on a device that cannot read aloud, and still shows the thumbs up', async () => {
    renderTutorAvatar()

    fireEvent.click(play())
    await settle(() => spoken().onerror?.({ error: 'synthesis-failed' }))

    expect(
      screen.getByText('This device cannot read aloud, so the tutor’s lips will not move.'),
    ).toBeVisible()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'encourage')
  })

  it('gives each tutor a voice of their own: the device’s first of that kind', () => {
    deviceVoices = [voice(RAVI), voice(HEERA)]
    renderTutorAvatar()

    expect(screen.getByText('Voice: Ravi')).toBeVisible()
    fireEvent.click(play())
    expect(spoken().voice?.voiceURI).toBe(RAVI)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    fireEvent.click(screen.getByRole('radio', { name: 'Female tutor' }))
    expect(screen.getByText('Voice: Heera')).toBeVisible()
    fireEvent.click(play())
    expect(spoken().voice?.voiceURI).toBe(HEERA)
    // Nothing is chosen by trying a tutor out.
    expect(useVoiceStore.getState().voices).toEqual({})
  })

  it('speaks with the voice chosen for the tutor in Voice settings', () => {
    deviceVoices = [voice(RAVI), voice(HEERA), voice(ZIRA)]
    useVoiceStore.setState({ voices: { en: { female: ZIRA } } })
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderTutorAvatar()

    expect(screen.getByText('Voice: Zira')).toBeVisible()
    fireEvent.click(play())
    expect(spoken().voice?.voiceURI).toBe(ZIRA)
  })

  it('uses the device’s best voice for a tutor it has no voice to suit', () => {
    deviceVoices = [voice(RAVI)]
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderTutorAvatar()

    expect(screen.getByText('Voice: Ravi')).toBeVisible()
    fireEvent.click(play())
    expect(spoken().voice?.voiceURI).toBe(RAVI)
  })

  it('points to where the tutor’s voice is chosen', () => {
    renderTutorAvatar()

    expect(screen.getByRole('link', { name: 'Voice settings' })).toHaveAttribute(
      'href',
      paths.profileVoice,
    )
  })
})
