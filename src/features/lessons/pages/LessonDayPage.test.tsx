import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from 'react-router'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { cancelSpeech, isSpeechSupported, speakAll } from '@/shared/lib/audio/speech'
import { WEEK_DIALOGUES_CONFIG_NAME } from '@/shared/lib/curriculum/weekDialogues'
import { WEEK_PICTURES_CONFIG_NAME } from '@/shared/lib/curriculum/weekPictures'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { lessonDayRoutes } from '../index'
import { useLessonStore } from '../store/useLessonStore'

// jsdom has no speech synthesis; its own tests cover it.
vi.mock('@/shared/lib/audio/speech', () => ({
  isSpeechSupported: vi.fn(),
  primeVoices: vi.fn(),
  cancelSpeech: vi.fn(),
  speak: vi.fn(),
  speakAll: vi.fn(),
}))

function NotFound() {
  const error = useRouteError()
  return <h1>{isRouteErrorResponse(error) && error.status === 404 ? 'Not found' : 'Error'}</h1>
}

function renderDay(path = '/lessons/weeks/1/days/1') {
  const router = createMemoryRouter([{ ErrorBoundary: NotFound, children: lessonDayRoutes }], {
    initialEntries: [path],
  })
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
}

const step = () => screen.findByRole('heading', { level: 1, name: 'Watch and listen' })
const next = () => screen.getByRole('button', { name: 'Next' })
const lines = () =>
  within(screen.getByRole('list', { name: 'Conversation' })).getAllByRole('listitem')

/** The device says every line at once and reports the conversation as heard. */
const speakToTheEnd: typeof speakAll = async (parts, options) => {
  parts.forEach((_, index) => options?.onPartStart?.(index))
  return 'ended'
}

beforeAll(async () => {
  // The route is lazy; load its chunk up front so no test waits on the transform.
  await import('./LessonDayPage')
})

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useLessonStore.setState({ heardWeeks: [] })
  vi.mocked(cancelSpeech).mockReset()
  vi.mocked(isSpeechSupported).mockReset().mockReturnValue(true)
  vi.mocked(speakAll).mockReset().mockImplementation(speakToTheEnd)
})

describe('Day 1, step 1: Watch and listen', () => {
  it('shows the week’s conversation, the step’s place in the day, and a locked Next', async () => {
    renderDay()
    await step()

    expect(screen.getByText('See how the conversation flows.')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Steps of this day' })).toHaveAttribute(
      'aria-valuenow',
      '17',
    )
    expect(screen.getByText('1/6')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to the week' })).toHaveAttribute(
      'href',
      '/home/weeks/1',
    )

    expect(lines()).toHaveLength(9)
    expect(lines()[0]).toHaveTextContent('AshaHello! Good morning.')
    expect(lines()[1]).toHaveTextContent('RaviGood morning! How are you?')
    // The conversation is English, whatever language the screen is in.
    expect(within(lines()[0] as HTMLElement).getByText('Hello! Good morning.')).toHaveAttribute(
      'lang',
      'en',
    )

    expect(next()).toBeDisabled()
    expect(next()).toHaveAccessibleDescription('Listen to the conversation once to continue.')
    // Nothing plays until the learner asks.
    expect(speakAll).not.toHaveBeenCalled()
  })

  it('reads the conversation aloud, one pitch per speaker, and then opens Next', async () => {
    renderDay()
    await step()

    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))

    const [parts, options] = vi.mocked(speakAll).mock.lastCall ?? []
    expect(parts).toHaveLength(9)
    expect(parts?.slice(0, 3)).toEqual([
      { text: 'Hello! Good morning.', pitch: 1.1 },
      { text: 'Good morning! How are you?', pitch: 0.85 },
      { text: 'I’m fine, thank you. And you?', pitch: 1.1 },
    ])
    expect(options?.rate).toBe(1)

    expect(next()).toBeEnabled()
    expect(screen.queryByText('Listen to the conversation once to continue.')).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'Lines played' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    expect(useLessonStore.getState().heardWeeks).toEqual([1])
  })

  it('marks the line being said, and does not count a conversation that was stopped', async () => {
    let finish: (outcome: 'ended' | 'cancelled') => void = () => {}
    vi.mocked(speakAll).mockImplementationOnce((_parts, options) => {
      options?.onPartStart?.(1)
      return new Promise((resolve) => {
        finish = resolve
      })
    })
    renderDay()
    await step()

    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))
    expect(lines()[1]).toHaveAttribute('aria-current', 'true')
    expect(lines()[0]).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Play slowly' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(cancelSpeech).toHaveBeenCalled()
    await act(async () => finish('cancelled'))

    expect(screen.getByRole('button', { name: 'Play the conversation' })).toBeVisible()
    expect(lines()[1]).not.toHaveAttribute('aria-current')
    expect(next()).toBeDisabled()
    expect(useLessonStore.getState().heardWeeks).toEqual([])
  })

  it('plays slowly on request, and that counts as heard too', async () => {
    renderDay()
    await step()

    await userEvent.click(screen.getByRole('button', { name: 'Play slowly' }))
    expect(vi.mocked(speakAll).mock.lastCall?.[1]?.rate).toBe(0.75)
    expect(next()).toBeEnabled()
  })

  it('says one line again without unlocking Next', async () => {
    renderDay()
    await step()

    await userEvent.click(
      screen.getByRole('button', { name: 'Listen to this line: Good morning! How are you?' }),
    )
    expect(vi.mocked(speakAll).mock.lastCall?.[0]).toEqual([
      { text: 'Good morning! How are you?', pitch: 0.85 },
    ])
    expect(next()).toBeDisabled()
  })

  it('moves on to a screen that says the rest of the day is coming', async () => {
    renderDay()
    await step()
    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))
    await userEvent.click(next())

    expect(
      screen.getByRole('heading', { level: 1, name: 'More of this day is coming soon' }),
    ).toBeVisible()
    expect(screen.getByText('Week 1 · Day 1')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to the week' })).toHaveAttribute(
      'href',
      '/home/weeks/1',
    )
  })

  it('leaves Next open for a learner who heard the conversation before', async () => {
    useLessonStore.setState({ heardWeeks: [1] })
    renderDay()
    await step()
    expect(next()).toBeEnabled()
  })
})

describe('a device that cannot play the conversation', () => {
  it('says so and lets the learner read on, when the voice fails', async () => {
    vi.mocked(speakAll).mockRejectedValue(new Error('no voice'))
    renderDay()
    await step()
    expect(next()).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This device cannot play the conversation. Read it below, then continue.',
    )
    expect(next()).toBeEnabled()
    // Not being able to hear it is not having heard it.
    expect(useLessonStore.getState().heardWeeks).toEqual([])
  })

  it('never locks Next when the device has no speech at all', async () => {
    vi.mocked(isSpeechSupported).mockReturnValue(false)
    renderDay()
    await step()

    expect(screen.getByRole('alert')).toBeVisible()
    expect(next()).toBeEnabled()
  })
})

describe('Dialogue and Transcript', () => {
  it('offers no transcript to a learner who chose English', async () => {
    useLanguageStore.setState({ language: 'en' })
    renderDay()
    await step()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('adds the learner’s language under each line in the transcript', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderDay()
    await screen.findByRole('heading', { level: 1, name: 'দেখুন ও শুনুন' })
    const list = () => screen.getByRole('list', { name: 'কথোপকথন' })

    expect(screen.getByRole('radio', { name: 'সংলাপ' })).toBeChecked()
    expect(within(list()).getAllByRole('button')).toHaveLength(9)
    expect(within(list()).queryByText('হ্যালো! সুপ্রভাত।')).toBeNull()

    await userEvent.click(screen.getByRole('radio', { name: 'লিখিত রূপ' }))
    const first = within(list()).getAllByRole('listitem')[0] as HTMLElement
    expect(within(first).getByText('Hello! Good morning.')).toHaveAttribute('lang', 'en')
    expect(within(first).getByText('হ্যালো! সুপ্রভাত।')).toHaveAttribute('lang', 'bn')
    // The transcript is for reading; hearing a line again belongs to the dialogue.
    expect(within(list()).queryByRole('button')).toBeNull()
  })

  it('offers no transcript in a language the conversation is not translated into', async () => {
    useLanguageStore.setState({ language: 'ta' })
    renderDay()
    await step()
    expect(screen.queryByRole('radio')).toBeNull()
  })
})

describe('what an admin set', () => {
  const written = {
    videoUrl: 'https://cdn.example.com/week1.mp4',
    lines: [
      { speaker: 'Meera', text: 'Hi there!', translations: {} },
      { speaker: 'Arjun', text: 'Hello!', translations: {} },
    ],
  }

  it('shows their conversation, and their picture behind the play button', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: { ...written, videoUrl: null } })
    settingsRepository.write(WEEK_PICTURES_CONFIG_NAME, { 1: '/weeks/meeting.webp' })
    renderDay()
    await step()

    expect(lines().map((line) => line.textContent)).toEqual(['MeeraHi there!', 'ArjunHello!'])
    expect(document.querySelector('main img')).toHaveAttribute('src', '/weeks/meeting.webp')
    expect(document.querySelector('video')).toBeNull()
  })

  it('plays their video instead of the voice, and opens Next when it has been watched', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: written })
    renderDay()
    await step()

    const video = document.querySelector('video') as HTMLVideoElement
    expect(video).toHaveAttribute('src', 'https://cdn.example.com/week1.mp4')
    expect(video).toHaveAttribute('controls')
    expect(screen.queryByRole('button', { name: 'Play the conversation' })).toBeNull()
    expect(next()).toBeDisabled()

    fireEvent.ended(video)
    expect(next()).toBeEnabled()
    expect(useLessonStore.getState().heardWeeks).toEqual([1])
  })

  it('falls back to the device’s voice when the video cannot be played', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: written })
    renderDay()
    await step()

    fireEvent.error(document.querySelector('video') as HTMLVideoElement)
    expect(document.querySelector('video')).toBeNull()
    expect(screen.getByRole('button', { name: 'Play the conversation' })).toBeVisible()
  })

  it('opens the step for a week once it has a conversation', async () => {
    settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 2: { ...written, videoUrl: null } })
    renderDay('/lessons/weeks/2/days/1')
    await step()
    expect(lines()).toHaveLength(2)
  })
})

describe('a day with nothing in it yet', () => {
  it.each([
    ['/lessons/weeks/2/days/1', 'Week 2 · Day 1', '/home/weeks/2'],
    ['/lessons/weeks/1/days/2', 'Week 1 · Day 2', '/home/weeks/1'],
  ])('says the lessons of %s are coming, and leads back to the week', async (path, title, back) => {
    renderDay(path)

    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeVisible()
    expect(screen.getByText('This day’s lessons are coming soon.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to the week' })).toHaveAttribute('href', back)
  })

  it.each(['/lessons/weeks/51/days/1', '/lessons/weeks/1/days/8', '/lessons/weeks/x/days/1'])(
    'treats %s as a page that does not exist',
    async (path) => {
      renderDay(path)
      expect(await screen.findByRole('heading', { name: 'Not found' })).toBeVisible()
    },
  )
})
