import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { installFakeSound, removeFakeSound, testVoice, type FakeSound } from '@/test/fakeSound'
import { TutorAvatarPage } from './TutorAvatarPage'

const SAMPLE = 'Hello! Let’s practise speaking English together.'

let sound: FakeSound

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
/** Does something, then lets the sound that follows from it be fetched, start or end. */
const settle = (something: () => void = () => {}) =>
  act(async () => {
    something()
    await vi.advanceTimersByTimeAsync(0)
  })
const lastPlayed = () => sound.played.at(-1)

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useVoiceStore.setState({ voices: {} })
  useTutorAvatarStore.setState({ avatar: null })
  sound = installFakeSound()
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  removeFakeSound()
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

    await settle(() => fireEvent.click(play()))
    expect(lastPlayed()?.text).toBe(SAMPLE)
    expect(screen.getByText(SAMPLE)).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeVisible()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'neutral')

    const shapes = new Set<string | null>()
    for (let frame = 0; frame < 6; frame += 1) {
      shapes.add(tutor('Male tutor').getAttribute('data-mouth'))
      act(() => vi.advanceTimersByTime(85))
    }
    expect(shapes.size).toBeGreaterThan(2)

    // Said to the end: a thumbs up for a moment, then back to the smile.
    await settle(() => sound.endSound())
    expect(tutor('Male tutor')).toHaveAttribute('data-mouth', 'rest')
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'encourage')
    expect(play()).toBeVisible()

    act(() => vi.advanceTimersByTime(2500))
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'smile')
  })

  it('stops a sample that is playing, without the thumbs up', async () => {
    renderTutorAvatar()

    await settle(() => fireEvent.click(play()))
    await settle(() => fireEvent.click(screen.getByRole('button', { name: 'Stop' })))

    expect(sound.paused()).toBe(true)
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'smile')
    expect(tutor('Male tutor')).toHaveAttribute('data-mouth', 'rest')
    expect(play()).toBeVisible()
  })

  it('says so when the sample cannot be played, and still shows the thumbs up', async () => {
    sound.serverUp(false)
    renderTutorAvatar()

    await settle(() => fireEvent.click(play()))

    expect(
      screen.getByText('The sample cannot be played right now, so the tutor’s lips will not move.'),
    ).toBeVisible()
    expect(tutor('Male tutor')).toHaveAttribute('data-mood', 'encourage')
  })

  it('gives each tutor a voice of their own: the default of that kind', async () => {
    renderTutorAvatar()

    expect(screen.getByText('Voice: Michael')).toBeVisible()
    await settle(() => fireEvent.click(play()))
    expect(lastPlayed()?.voice).toBe('am_michael')
    await settle(() => fireEvent.click(screen.getByRole('button', { name: 'Stop' })))

    fireEvent.click(screen.getByRole('radio', { name: 'Female tutor' }))
    expect(screen.getByText('Voice: Heart')).toBeVisible()
    await settle(() => fireEvent.click(play()))
    expect(lastPlayed()?.voice).toBe('af_heart')
    // Nothing is chosen by trying a tutor out.
    expect(useVoiceStore.getState().voices).toEqual({})
  })

  it('speaks with the voice chosen for the tutor in Voice settings', async () => {
    useVoiceStore.setState({ voices: { en: { female: 'bf_emma' } } })
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderTutorAvatar()

    expect(screen.getByText('Voice: Emma')).toBeVisible()
    await settle(() => fireEvent.click(play()))
    expect(lastPlayed()?.voice).toBe('bf_emma')
  })

  it('uses whatever voice there is for a tutor the server has no voice to suit', async () => {
    removeFakeSound()
    sound = installFakeSound([testVoice('bm_george', 'en-GB')])
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderTutorAvatar()

    expect(screen.getByText('Voice: George')).toBeVisible()
    await settle(() => fireEvent.click(play()))
    expect(lastPlayed()?.voice).toBe('bm_george')
  })

  it('points to where the tutor’s voice is chosen', () => {
    renderTutorAvatar()

    expect(screen.getByRole('link', { name: 'Voice settings' })).toHaveAttribute(
      'href',
      paths.profileVoice,
    )
  })
})
