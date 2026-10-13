import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/lib/api/client'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import type * as Microphone from '@/shared/lib/audio/microphone'
import { MicrophoneError, microphoneAllowed } from '@/shared/lib/audio/microphone'
import { startRecording } from '@/shared/lib/audio/recorder'
import {
  cancelSpeech,
  hasVoiceFor,
  isSpeechSupported,
  speak,
  speakAll,
} from '@/shared/lib/audio/speech'
import {
  canListenForVoice,
  listenForVoice,
  type VoiceReading,
} from '@/shared/lib/audio/voiceActivity'
import { canMakeWav, recordingToWav } from '@/shared/lib/audio/wav'
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
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { useLessonProgressStore } from '@/shared/lib/learner/lessonProgress'
import { useProfilePhotoStore } from '@/shared/lib/learner/profilePhoto'
import { useTutorAvatarStore } from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { checkPronunciation } from '../api/pronunciation'
import { checkReply } from '../api/reply'
import { lessonDayRoutes } from '../index'

// jsdom has no speech synthesis, microphone or audio playback; their own tests cover them.
vi.mock('@/shared/lib/audio/speech', () => ({
  isSpeechSupported: vi.fn(),
  hasVoiceFor: vi.fn(),
  onVoicesChanged: () => () => {},
  // What a drawn face moves its lips by: here nothing is ever being said.
  onSpeechActivity: () => () => {},
  primeVoices: vi.fn(),
  cancelSpeech: vi.fn(),
  speak: vi.fn(),
  speakAll: vi.fn(),
}))
vi.mock('@/shared/lib/audio/recorder', () => ({ startRecording: vi.fn() }))
// Nor a way to read a recording back as a WAV, or a server to check one.
vi.mock('@/shared/lib/audio/wav', () => ({ canMakeWav: vi.fn(), recordingToWav: vi.fn() }))
vi.mock('../api/pronunciation', () => ({ checkPronunciation: vi.fn() }))
vi.mock('../api/reply', () => ({ checkReply: vi.fn() }))
// Nor a way to measure sound, or a browser that remembers allowing the microphone.
vi.mock('@/shared/lib/audio/voiceActivity', () => ({
  prepareListening: vi.fn(),
  restListening: vi.fn(),
  canListenForVoice: vi.fn(),
  listenForVoice: vi.fn(),
}))
vi.mock('@/shared/lib/audio/microphone', async (importOriginal) => ({
  ...(await importOriginal<typeof Microphone>()),
  microphoneAllowed: vi.fn(),
  primeMicrophonePermission: vi.fn(),
}))

function NotFound() {
  const error = useRouteError()
  return <h1>{isRouteErrorResponse(error) && error.status === 404 ? 'Not found' : 'Error'}</h1>
}

function renderDay(path = '/lessons/weeks/1/days/1') {
  const router = createMemoryRouter(
    [
      { ErrorBoundary: NotFound, children: lessonDayRoutes },
      { path: paths.homeWeek, element: <h1>The week</h1> },
    ],
    { initialEntries: [path] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const next = () => screen.getByRole('button', { name: 'Next' })
const progress = () => useLessonProgressStore.getState()

/** The device says every line at once and reports the conversation as heard. */
const speakToTheEnd: typeof speakAll = async (parts, options) => {
  parts.forEach((_, index) => options?.onPartStart?.(index))
  return 'ended'
}

/** The learner's recording, as it is sent to be checked. */
const wav = new Blob(['wav'], { type: 'audio/wav' })

/** A microphone that records until stopped. */
const recordUntilStopped: typeof startRecording = async () => {
  let end: (recording: { blob: Blob; durationMs: number; mimeType: string }) => void = () => {}
  const finished = new Promise<{ blob: Blob; durationMs: number; mimeType: string }>(
    (resolve) => (end = resolve),
  )
  return {
    stop: () => end({ blob: new Blob(['voice']), durationMs: 1200, mimeType: 'audio/webm' }),
    finished,
    stream: {} as MediaStream,
  }
}

beforeAll(async () => {
  // The route is lazy; load its chunk up front so no test waits on the transform.
  await import('./LessonDayPage')
  Object.assign(URL, { createObjectURL: () => 'blob:take', revokeObjectURL: () => {} })
})

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
  useLessonProgressStore.setState({
    heardWeeks: [],
    doneDays: {},
    reviewParts: {},
    scenariosDone: {},
  })
  vi.mocked(cancelSpeech).mockReset()
  vi.mocked(isSpeechSupported).mockReset().mockReturnValue(true)
  // Like most devices, this one has an English voice only.
  vi.mocked(hasVoiceFor).mockReset().mockReturnValue(false)
  vi.mocked(speakAll).mockReset().mockImplementation(speakToTheEnd)
  vi.mocked(speak).mockReset().mockResolvedValue('ended')
  vi.mocked(startRecording).mockReset().mockImplementation(recordUntilStopped)
  // Like a first visit on a device that cannot measure sound: every turn is taken by tapping.
  vi.mocked(microphoneAllowed).mockReset().mockReturnValue(false)
  vi.mocked(canListenForVoice).mockReset().mockReturnValue(false)
  vi.mocked(listenForVoice).mockReset().mockReturnValue(null)
  // Like jsdom itself, which cannot read a recording back: nothing is offered to be checked.
  // A learner who has chosen no tutor (so it is the man) and has no picture of their own.
  useTutorAvatarStore.setState({ avatar: null })
  useProfilePhotoStore.setState({ photo: null })
  vi.mocked(canMakeWav).mockReset().mockReturnValue(false)
  vi.mocked(recordingToWav).mockReset().mockResolvedValue(wav)
  vi.mocked(checkPronunciation).mockReset()
  vi.mocked(checkReply).mockReset()
})

describe('Day 1: Watch and listen', () => {
  const step = () => screen.findByRole('heading', { level: 1, name: 'Watch and listen' })
  const lines = () =>
    within(screen.getByRole('list', { name: 'Conversation' })).getAllByRole('listitem')

  it('shows the week’s conversation, the day’s place in the week, and a locked Next', async () => {
    renderDay()
    await step()

    expect(screen.getByText('See how the conversation flows.')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Days of this week' })).toHaveAttribute(
      'aria-valuenow',
      '14',
    )
    expect(screen.getByText('1/7')).toBeVisible()
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

  it('reads the conversation aloud, each speaker in a voice of their own, and then opens Next', async () => {
    renderDay()
    await step()

    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))

    // Asha is a woman and Ravi a man, whoever speaks first; which voice that is, is the speech
    // module's to say. The speakers are numbered too, for a conversation that does not say.
    const [parts, options] = vi.mocked(speakAll).mock.lastCall ?? []
    expect(parts).toHaveLength(9)
    expect(parts?.slice(0, 3)).toEqual([
      { text: 'Hello! Good morning.', speaker: 0, voice: 'female' },
      { text: 'Good morning! How are you?', speaker: 1, voice: 'male' },
      { text: 'I’m fine, thank you. And you?', speaker: 0, voice: 'female' },
    ])
    expect(options?.rate).toBe(1)

    expect(next()).toBeEnabled()
    expect(screen.queryByText('Listen to the conversation once to continue.')).toBeNull()
    expect(screen.getByRole('progressbar', { name: 'Lines played' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
    expect(progress().heardWeeks).toEqual([1])
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
    expect(progress().heardWeeks).toEqual([])
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
      { text: 'Good morning! How are you?', speaker: 1, voice: 'male' },
    ])
    expect(next()).toBeDisabled()
  })

  it('finishes the day on Next and goes back to the week', async () => {
    const router = renderDay()
    await step()
    await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))
    await userEvent.click(next())

    expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/home/weeks/1')
    expect(progress().doneDays).toEqual({ 1: [1] })
  })

  it.each([
    ['heard the conversation before', { heardWeeks: [1], doneDays: {} }],
    ['finished the day before', { heardWeeks: [], doneDays: { 1: [1] } }],
  ])('leaves Next open for a learner who %s', async (_what, saved) => {
    useLessonProgressStore.setState(saved)
    renderDay()
    await step()
    expect(next()).toBeEnabled()
  })

  describe('on a device that cannot play it', () => {
    it('says so and lets the learner read on, when the voice fails', async () => {
      vi.mocked(speakAll).mockRejectedValue(new Error('no voice'))
      renderDay()
      await step()
      expect(next()).toBeDisabled()

      await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The conversation cannot be played right now. Read it below, then continue.',
      )
      expect(next()).toBeEnabled()
      // Not being able to hear it is not having heard it.
      expect(progress().heardWeeks).toEqual([])
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

  describe('with what an admin set', () => {
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

    it('gives speakers they said nothing about the tutors’ voices by turn, and the rest their own', async () => {
      settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, {
        1: { ...written, videoUrl: null, voices: { Arjun: 'male' } },
      })
      renderDay()
      await step()
      await userEvent.click(screen.getByRole('button', { name: 'Play the conversation' }))

      expect(vi.mocked(speakAll).mock.lastCall?.[0]).toEqual([
        { text: 'Hi there!', speaker: 0 },
        { text: 'Hello!', speaker: 1, voice: 'male' },
      ])
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
      expect(progress().heardWeeks).toEqual([1])
    })

    it('falls back to the device’s voice when the video cannot be played', async () => {
      settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 1: written })
      renderDay()
      await step()

      fireEvent.error(document.querySelector('video') as HTMLVideoElement)
      expect(document.querySelector('video')).toBeNull()
      expect(screen.getByRole('button', { name: 'Play the conversation' })).toBeVisible()
    })

    it('opens the day for a week once it has a conversation', async () => {
      settingsRepository.write(WEEK_DIALOGUES_CONFIG_NAME, { 2: { ...written, videoUrl: null } })
      renderDay('/lessons/weeks/2/days/1')
      await step()
      expect(lines()).toHaveLength(2)
    })
  })
})

describe('going back a day, to go through it again', () => {
  const previous = (day: number) => screen.queryByRole('link', { name: `Go back to Day ${day}` })

  it.each([2, 3, 4, 5, 6, 7])('Day %i has a way back to the day before it', async (day) => {
    renderDay(`/lessons/weeks/1/days/${day}`)
    await screen.findByRole('link', { name: 'Back to the week' })

    const back = previous(day - 1)
    expect(back).toHaveAttribute('href', `/lessons/weeks/1/days/${day - 1}`)
    // What is written on it is part of what it is called.
    expect(back).toHaveTextContent(`Day ${day - 1}`)
  })

  it('Day 1 has none: the week’s overview is what lies behind it', async () => {
    renderDay('/lessons/weeks/1/days/1')
    await screen.findByRole('heading', { level: 1, name: 'Watch and listen' })

    expect(screen.queryByRole('link', { name: /^Go back to Day/ })).toBeNull()
  })

  it.each([
    ['a part of the review', '/lessons/weeks/1/days/6?part=quiz', 'Back to the review'],
    [
      'a challenge under way',
      '/lessons/weeks/1/days/7?scenario=1&level=standard',
      'Back to the scenarios',
    ],
  ])('%s has only its own way back, to the day it belongs to', async (_, path, backName) => {
    renderDay(path)

    expect(await screen.findByRole('link', { name: backName })).toBeVisible()
    expect(screen.queryByRole('link', { name: /^Go back to Day/ })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Back to the week' })).toBeNull()
  })

  it('opens the day before with nothing locked, when it was finished', async () => {
    useLessonProgressStore.setState({ heardWeeks: [1], doneDays: { 1: [1] } })
    const router = renderDay('/lessons/weeks/1/days/2')
    await screen.findByRole('heading', { level: 1, name: 'Learn useful words' })

    await userEvent.click(previous(1) as HTMLElement)

    expect(await screen.findByRole('heading', { level: 1, name: 'Watch and listen' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/lessons/weeks/1/days/1')
    expect(next()).toBeEnabled()
    // Going through it again changes nothing that was done.
    await userEvent.click(next())
    expect(progress().doneDays).toEqual({ 1: [1] })
  })

  it('counts the day in the learner’s digits, in their language', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderDay('/lessons/weeks/1/days/3')

    const back = await screen.findByRole('link', { name: 'দিন ২-এ ফিরে যান' })
    expect(back).toHaveTextContent('দিন ২')
  })
})

describe('Day 2: Learn useful words', () => {
  const day2 = '/lessons/weeks/1/days/2'
  const step = () => screen.findByRole('heading', { level: 1, name: 'Learn useful words' })
  const cards = () => within(screen.getByRole('list', { name: 'Words' })).getAllByRole('button')
  const card = (word: string) =>
    within(screen.getByRole('list', { name: 'Words' })).getByRole('button', {
      name: new RegExp(`^${word}`),
    })
  const allWords = ['hello', 'good morning', 'name', 'thank you', 'nice to meet you', 'goodbye']

  it('shows the week’s words, the day’s place in the week, and a locked Next', async () => {
    renderDay(day2)
    await step()

    expect(screen.getByText('Tap each word to hear and repeat.')).toBeVisible()
    expect(screen.getByText('2/7')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Days of this week' })).toHaveAttribute(
      'aria-valuenow',
      '29',
    )

    expect(cards().map((button) => button.textContent)).toEqual([
      'hhello/həˈləʊ/',
      'ggood morning/ɡʊd ˈmɔːnɪŋ/',
      'nname/neɪm/',
      'tthank you/ˈθæŋk juː/',
      'nnice to meet you/naɪs tə ˈmiːt juː/',
      'ggoodbye/ɡʊdˈbaɪ/',
    ])
    // The stand-in letter is shown as a capital. A screen reader is given the word alone, not
    // the letter or the phonetic spelling.
    expect(card('hello')).toHaveAccessibleName('hello')
    expect(within(card('hello')).getByText('hello')).toHaveAttribute('lang', 'en')
    // The first word is the one to practise until another is tapped.
    expect(card('hello')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('hello', { selector: 'section span' })).toBeVisible()

    expect(next()).toBeDisabled()
    expect(next()).toHaveAccessibleDescription('Listen to every word once to continue.')
    expect(speak).not.toHaveBeenCalled()
  })

  it('says a word when it is tapped, marks it heard, and makes it the one to practise', async () => {
    renderDay(day2)
    await step()

    await userEvent.click(card('goodbye'))

    expect(speak).toHaveBeenLastCalledWith('goodbye', { rate: 1 })
    expect(card('goodbye')).toHaveAttribute('aria-pressed', 'true')
    expect(card('goodbye')).toHaveAccessibleName('goodbye Heard')
    expect(card('hello')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { level: 2, name: 'Practice pronunciation' })).toBeVisible()
    expect(screen.getByText('goodbye', { selector: 'section span' })).toBeVisible()
    // One word heard is not all of them.
    expect(next()).toBeDisabled()
  })

  it('opens Next once every word has been heard, and finishing goes back to the week', async () => {
    const router = renderDay(day2)
    await step()

    for (const word of allWords.slice(0, 5)) await userEvent.click(card(word))
    expect(next()).toBeDisabled()
    await userEvent.click(card('goodbye'))
    expect(next()).toBeEnabled()
    expect(screen.queryByText('Listen to every word once to continue.')).toBeNull()

    await userEvent.click(next())
    expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/home/weeks/1')
    expect(progress().doneDays).toEqual({ 1: [2] })
  })

  it('does not count a word that was cut short', async () => {
    vi.mocked(speak).mockResolvedValueOnce('cancelled')
    renderDay(day2)
    await step()

    await userEvent.click(card('name'))
    expect(card('name')).toHaveAccessibleName('name')
  })

  it('leaves Next open for a learner who finished the day before', async () => {
    useLessonProgressStore.setState({ doneDays: { 1: [2] } })
    renderDay(day2)
    await step()
    expect(next()).toBeEnabled()
  })

  it('shows what each word means to a learner with a mother tongue, and to no one else', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderDay(day2)
    await screen.findByRole('heading', { level: 1, name: 'দরকারি শব্দ শিখুন' })

    const first = within(screen.getByRole('list', { name: 'শব্দ' })).getAllByRole('button')[0]
    expect(within(first as HTMLElement).getByText('হ্যালো')).toHaveAttribute('lang', 'bn')
    expect(within(first as HTMLElement).getByText('hello')).toHaveAttribute('lang', 'en')
  })

  describe('how a word is said', () => {
    const parts = () =>
      within(screen.getByRole('list', { name: 'The word in parts' }))
        .getAllByRole('listitem')
        .map((part) => part.textContent)
    const tips = () => {
      const card = screen.getByRole('heading', { level: 2, name: 'How to say it' }).parentElement
      return within(card as HTMLElement)
        .getAllByRole('listitem')
        .map((tip) => tip.textContent)
    }

    it('shows the parts of the word being practised, and names the strong one', async () => {
      renderDay(day2)
      await step()

      expect(parts()).toEqual(['hel', 'loStrong'])
      expect(screen.getByText('lo')).toHaveAttribute('lang', 'en')
      expect(screen.queryByText(/^Crossed-out letters/)).toBeNull()

      await userEvent.click(card('nice to meet you'))
      expect(parts()).toEqual(['nice', 'to', 'meetStrong', 'you'])
    })

    it('crosses out the letters that are not said, and says which to a screen reader', async () => {
      renderDay(day2)
      await step()
      await userEvent.click(card('name'))

      // One part: nothing to call strong.
      expect(parts()).toEqual(['name'])
      const crossed = within(screen.getByRole('list', { name: 'The word in parts' })).getByText('e')
      expect(crossed.tagName).toBe('S')
      expect(crossed).toHaveAttribute('aria-hidden', 'true')
      expect(screen.getByText(/^Crossed-out letters are not said/)).toHaveTextContent(
        'Crossed-out letters are not said: e',
      )
    })

    it('gives that word’s tips, which change with the word', async () => {
      renderDay(day2)
      await step()
      expect(tips()).toEqual([
        'Say the second part longer and louder.',
        'Keep the first part short and soft.',
      ])

      await userEvent.click(card('name'))
      expect(tips()).toEqual(['The “a” sounds like “ay”.', 'The last “e” is not said.'])
    })

    it('says the words slowly when asked, and that counts as heard too', async () => {
      renderDay(day2)
      await step()
      expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked()

      await userEvent.click(screen.getByRole('radio', { name: 'Slowly' }))
      await userEvent.click(card('hello'))

      expect(speak).toHaveBeenLastCalledWith('hello', { rate: 0.75 })
      expect(card('hello')).toHaveAccessibleName('hello Heard')
    })

    it('gives the tips in the learner’s language, and in English where theirs has none', async () => {
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day2)
      await screen.findByRole('heading', { level: 1, name: 'দরকারি শব্দ শিখুন' })

      const own = screen.getByText('প্রথম অংশটি ছোট ও হালকা রাখুন।')
      expect(own.closest('ul')).toHaveAttribute('lang', 'bn')
      expect(screen.getByText('জোর দিন')).toBeVisible()

      const written = {
        word: 'coffee',
        syllables: ['cof', 'fee'],
        stress: 1,
        tips: { en: ['Say “cof” louder.'] },
      }
      act(() => settingsRepository.write(WEEK_VOCABULARY_CONFIG_NAME, { 1: { words: [written] } }))
      expect((await screen.findByText('Say “cof” louder.')).closest('ul')).toHaveAttribute(
        'lang',
        'en',
      )
    })
  })

  it('lets a learner go on when the device cannot say the words', async () => {
    vi.mocked(speak).mockRejectedValue(new Error('no voice'))
    renderDay(day2)
    await step()
    expect(next()).toBeDisabled()

    await userEvent.click(card('hello'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The words cannot be played right now. Read them, then continue.',
    )
    expect(next()).toBeEnabled()
    // A speed for a voice that is not there would be a control that does nothing.
    expect(screen.queryByRole('group', { name: 'Speed' })).toBeNull()
  })

  describe('practising the pronunciation', () => {
    const mic = (name: string) => screen.getByRole('button', { name })

    it('explains the microphone before asking for it, and asks only on a tap', async () => {
      renderDay(day2)
      await step()

      expect(
        screen.getByText('We will ask to use your microphone. Your recording is not saved.'),
      ).toBeVisible()
      expect(startRecording).not.toHaveBeenCalled()
    })

    it('records the learner saying the word, and plays it back to them', async () => {
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      renderDay(day2)
      await step()

      await userEvent.click(mic('Tap to speak'))
      expect(startRecording).toHaveBeenCalledOnce()
      expect(await screen.findByText(/^Recording…/)).toBeVisible()
      // The device's own voice must not end up in the recording.
      expect(cancelSpeech).toHaveBeenCalled()

      await userEvent.click(mic('Stop recording'))
      expect(await screen.findByText('Recorded. Listen, or try again.')).toBeVisible()

      await userEvent.click(mic('Listen to yourself'))
      expect(play).toHaveBeenCalledOnce()
      // Speaking is never required: Next still waits for the words to be heard, nothing else.
      expect(next()).toBeDisabled()
      play.mockRestore()
    })

    it('forgets the attempt when the learner moves to another word', async () => {
      renderDay(day2)
      await step()
      await userEvent.click(mic('Tap to speak'))
      await screen.findByText(/^Recording…/)
      await userEvent.click(mic('Stop recording'))
      await screen.findByText('Recorded. Listen, or try again.')

      await userEvent.click(card('name'))
      expect(screen.queryByRole('button', { name: 'Listen to yourself' })).toBeNull()
      expect(screen.getByText('Tap to speak', { selector: 'p' })).toBeVisible()
    })

    it('explains a blocked microphone and still lets the learner finish the day', async () => {
      vi.mocked(startRecording).mockRejectedValue(new MicrophoneError('denied'))
      renderDay(day2)
      await step()

      await userEvent.click(mic('Tap to speak'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The microphone is blocked for this app.',
      )

      for (const word of allWords) await userEvent.click(card(word))
      expect(next()).toBeEnabled()
    })

    describe('having the recording checked', () => {
      const checkButton = () => screen.queryByRole('button', { name: 'Check how I said it' })
      const askToCheck = () =>
        userEvent.click(screen.getByRole('button', { name: 'Check how I said it' }))
      const found = () => screen.findByRole('region', { name: 'How it sounded' })
      const record = async () => {
        await userEvent.click(mic('Tap to speak'))
        await screen.findByText(/^Recording…/)
        await userEvent.click(mic('Stop recording'))
        await screen.findByText('Recorded. Listen, or try again.')
      }

      beforeEach(() => {
        vi.mocked(canMakeWav).mockReturnValue(true)
        // The take is kept by an address in the page's memory; these are its bytes.
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => new Response('voice')),
        )
      })
      afterEach(() => vi.unstubAllGlobals())

      it('is not offered on a device that cannot send its recording', async () => {
        vi.mocked(canMakeWav).mockReturnValue(false)
        renderDay(day2)
        await step()
        await record()

        expect(checkButton()).toBeNull()
        expect(screen.getByRole('button', { name: 'Listen to yourself' })).toBeVisible()
      })

      it('sends nothing until the learner asks, and says beside the button what asking does', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'ok', confidence: 1 }],
        })
        renderDay(day2)
        await step()
        expect(checkButton()).toBeNull()

        await record()
        expect(checkButton()).toBeVisible()
        expect(
          screen.getByText('Sends this recording to our server to be checked. It is not kept.'),
        ).toBeVisible()
        expect(checkPronunciation).not.toHaveBeenCalled()

        await askToCheck()
        const region = await found()
        // As a WAV, with the word, its parts and its strong part as the lesson has them.
        expect(recordingToWav).toHaveBeenCalledOnce()
        expect(checkPronunciation).toHaveBeenCalledExactlyOnceWith(wav, {
          word: 'hello',
          syllables: ['hel', 'lo'],
          stress: 2,
        })
        expect(region).toHaveTextContent('That sounded right. Well done!')
        // Every time: nothing has measured it on learners yet.
        expect(region).toHaveTextContent('This check is new and can be wrong.')
        // That take has been checked; another one brings the button back.
        expect(checkButton()).toBeNull()
        // Never a condition of the day.
        expect(next()).toBeDisabled()
      })

      it('says what to try, by the word’s own parts', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [
            { code: 'extraSyllable', confidence: 0.6, expected: 2, heard: 3 },
            { code: 'stressMoved', confidence: 0.8, expected: 2, heard: 1 },
            { code: 'soundDiffers', confidence: 0.9 },
          ],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()

        const region = await found()
        const list = within(region).getByRole('list', { name: 'Something to try' })
        // The findings themselves: a drawing under one has parts of its own.
        const said = [...list.children] as HTMLElement[]
        expect(said).toHaveLength(3)
        expect(said[0]).toHaveTextContent(
          'It sounded like there was an extra part. Parts in this word: 2. Parts heard: 3.',
        )
        expect(said[1]).toHaveTextContent(
          'Another part sounded like the strong one. Make “lo” the strong part.',
        )
        expect(said[2]).toHaveTextContent('One or more sounds were a little different.')
        expect(region).not.toHaveTextContent('That sounded right')
      })

      it('shows what was done beside what to do: the parts as beats, and where the stress fell', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [
            { code: 'extraSyllable', confidence: 0.6, expected: 2, heard: 3 },
            { code: 'stressMoved', confidence: 0.8, expected: 2, heard: 1 },
            { code: 'soundDiffers', confidence: 0.9 },
          ],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()

        const region = await found()
        const said = [...within(region).getByRole('list', { name: 'Something to try' }).children]
        /** One finding, by its place among them: its sentence and whatever is drawn under it. */
        const finding = (place: number) => {
          const line = said[place]
          if (!(line instanceof HTMLElement)) throw new Error(`There is no finding at ${place}`)
          return within(line)
        }

        // A beat for each part: two in the word, three heard. No part of the word is marked,
        // because which one was the extra is not known.
        expect(finding(0).getByRole('img', { name: 'The word: 2' })).toBeVisible()
        expect(finding(0).getByRole('img', { name: 'You: 3' })).toBeVisible()

        // The word's own parts twice: the strong one where it belongs, and where it was put.
        const strong = (row: string) =>
          within(finding(1).getByRole('list', { name: row }))
            .getAllByRole('listitem')
            .map((part) => part.textContent)
        expect(strong('The word')).toEqual(['hel', 'loStrong'])
        expect(strong('You')).toEqual(['helStrong', 'lo'])

        // Nothing is drawn for a sound that differed: which one is not told.
        expect(finding(2).queryByRole('img')).toBeNull()
        expect(finding(2).queryByRole('list')).toBeNull()
      })

      it('puts the word and the learner’s own recording side by side, to compare by ear', async () => {
        const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'stressMoved', confidence: 0.8, expected: 2, heard: 1 }],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()
        const region = await found()

        await userEvent.click(within(region).getByRole('button', { name: 'Hear the word' }))
        expect(speak).toHaveBeenLastCalledWith('hello', { rate: 1 })
        // Hearing it there is hearing it: the word is ticked like any other.
        expect(card('hello')).toHaveAccessibleName('hello Heard')
        // And what was found is still there, with the recording it was found in.
        expect(region).toBeVisible()

        await userEvent.click(within(region).getByRole('button', { name: 'Hear yourself' }))
        expect(play).toHaveBeenCalledOnce()
        play.mockRestore()
      })

      it('offers nothing to compare when there is nothing to try, and only the recording when the app cannot speak', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'ok', confidence: 1 }],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()
        const right = await found()
        expect(within(right).queryByRole('button')).toBeNull()
        expect(within(right).queryByRole('img')).toBeNull()

        vi.mocked(isSpeechSupported).mockReturnValue(false)
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'soundDiffers', confidence: 0.9 }],
        })
        await userEvent.click(mic('Tap to speak'))
        await screen.findByText(/^Recording…/)
        await userEvent.click(mic('Stop recording'))
        await screen.findByText('Recorded. Listen, or try again.')
        await askToCheck()

        const toTry = await found()
        expect(within(toTry).queryByRole('button', { name: 'Hear the word' })).toBeNull()
        expect(within(toTry).getByRole('button', { name: 'Hear yourself' })).toBeVisible()
      })

      it('says when nothing was heard', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'nothingHeard', confidence: 1 }],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()

        expect(await found()).toHaveTextContent('We could not hear a word.')
      })

      it.each([
        ['the server cannot check it', 503, 'unavailable', 'This cannot be checked right now.'],
        [
          'the recording is refused',
          400,
          'validation_failed',
          'This recording could not be checked.',
        ],
        ['too many were asked for', 429, 'rate_limited', 'That is a lot of checks.'],
      ])('says so when %s, and can be asked again', async (_, status, code, message) => {
        vi.mocked(checkPronunciation).mockRejectedValue(
          new ApiError(status, 'refused', { error: { code, message: 'for the log' } }),
        )
        renderDay(day2)
        await step()
        await record()
        await askToCheck()

        expect(await screen.findByRole('alert')).toHaveTextContent(message)
        expect(screen.getByRole('alert')).not.toHaveTextContent('for the log')
        expect(checkButton()).toBeEnabled()
        expect(screen.getByRole('button', { name: 'Listen to yourself' })).toBeVisible()
      })

      it('says the recording could not be checked when this browser cannot read it back', async () => {
        vi.mocked(recordingToWav).mockRejectedValue(new Error('cannot decode'))
        renderDay(day2)
        await step()
        await record()
        await askToCheck()

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'This recording could not be checked. Record the word again.',
        )
        expect(checkPronunciation).not.toHaveBeenCalled()
      })

      it('forgets what was found when the word is said again, or another word is chosen', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'ok', confidence: 1 }],
        })
        renderDay(day2)
        await step()
        await record()
        await askToCheck()
        await found()

        await userEvent.click(mic('Tap to speak'))
        await screen.findByText(/^Recording…/)
        expect(screen.queryByRole('region', { name: 'How it sounded' })).toBeNull()

        await userEvent.click(mic('Stop recording'))
        await screen.findByText('Recorded. Listen, or try again.')
        expect(checkButton()).toBeVisible()
        await userEvent.click(card('name'))
        expect(checkButton()).toBeNull()
      })
    })
  })

  describe('with what an admin set', () => {
    const written = {
      words: [
        { word: 'coffee', phonetic: '/ˈkɒfi/', imageUrl: '/words/coffee.webp', meanings: {} },
        { word: 'cake', phonetic: '', imageUrl: null, meanings: {} },
      ],
    }

    it('shows their words and pictures, and a letter where a picture fails to load', async () => {
      settingsRepository.write(WEEK_VOCABULARY_CONFIG_NAME, { 1: written })
      renderDay(day2)
      await step()

      expect(cards()).toHaveLength(2)
      const picture = within(card('coffee')).getByRole('presentation', { hidden: true })
      expect(picture).toHaveAttribute('src', '/words/coffee.webp')
      expect(card('cake')).toHaveTextContent(/^ccake$/)

      fireEvent.error(picture)
      expect(card('coffee')).toHaveTextContent('ccoffee/ˈkɒfi/')

      // Words with nothing written about how they are said are shown whole, with no tips.
      expect(screen.getByText('coffee', { selector: 'section span' })).toBeVisible()
      expect(screen.queryByRole('list', { name: 'The word in parts' })).toBeNull()
      expect(screen.queryByRole('heading', { level: 2, name: 'How to say it' })).toBeNull()
    })

    it('opens the day for a week once it has words', async () => {
      renderDay('/lessons/weeks/2/days/2')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 2' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_VOCABULARY_CONFIG_NAME, { 2: written }))
      await step()
      expect(cards()).toHaveLength(2)
    })
  })
})

describe('Day 3: Translate and speak', () => {
  const day3 = '/lessons/weeks/1/days/3'
  const step = () => screen.findByRole('heading', { level: 1, name: 'Translate and speak' })
  const button = (name: string) => screen.getByRole('button', { name })

  // The screen in Bengali, as a learner who translates from it sees it.
  const bn = {
    title: 'অনুবাদ করুন ও বলুন',
    sentence: 'বাক্য',
    field: 'আপনার অনুবাদ',
    check: 'মিলিয়ে দেখুন',
    showAnswer: 'উত্তর দেখুন',
    right: 'ঠিক হয়েছে। খুব ভালো!',
    compare: 'আপনার বাক্যটি এর সঙ্গে মিলিয়ে দেখুন।',
    next: 'পরবর্তী',
  }
  const openInBengali = async (path = day3) => {
    useLanguageStore.setState({ language: 'bn' })
    const router = renderDay(path)
    await screen.findByRole('heading', { level: 1, name: bn.title })
    return router
  }
  const field = () => screen.getByRole('textbox', { name: bn.field })

  describe('for a learner who translates from Bengali', () => {
    it('shows the sentence in Bengali, a field for the English, and a locked Next', async () => {
      await openInBengali()

      expect(screen.getByText('বাক্যটি অনুবাদ করুন, তারপর বলুন।')).toBeVisible()
      expect(screen.getByText('৫টি বাক্যের মধ্যে বাক্য ১')).toBeVisible()
      expect(screen.getByText('৩/৭')).toBeVisible()

      const card = screen.getByRole('region', { name: bn.sentence })
      expect(within(card).getByText('হ্যালো! সুপ্রভাত।')).toHaveAttribute('lang', 'bn')
      // Without a voice for Bengali, no button promises to read it out.
      expect(within(card).queryByRole('button')).toBeNull()

      expect(field()).toHaveValue('')
      expect(field()).toHaveAttribute('lang', 'en')
      // The answer is not given away.
      expect(screen.queryByText('Hello! Good morning.')).toBeNull()
      // The tips are there from the start, in the learner's language.
      expect(screen.getByText('দুপুরের আগে “Good morning” বলুন।').closest('ul')).toHaveAttribute(
        'lang',
        'bn',
      )

      expect(button(bn.next)).toBeDisabled()
      expect(button(bn.next)).toHaveAccessibleDescription(
        'এগিয়ে যেতে বাক্যটি অনুবাদ করুন অথবা “উত্তর দেখুন”-এ ট্যাপ করুন।',
      )
      expect(speak).not.toHaveBeenCalled()
    })

    it('ticks a translation that says the same as the answer, however it is typed', async () => {
      await openInBengali()

      await userEvent.type(field(), 'hello good morning{Enter}')

      expect(screen.getByText(bn.right)).toBeVisible()
      expect(screen.getByText('Hello! Good morning.')).toHaveAttribute('lang', 'en')
      expect(screen.queryByRole('button', { name: bn.check })).toBeNull()
      expect(button(bn.next)).toBeEnabled()
    })

    it('sets any other translation beside the answer, without calling it wrong', async () => {
      await openInBengali()

      await userEvent.type(field(), 'Hello morning')
      await userEvent.click(button(bn.check))

      expect(screen.getByText(bn.compare)).toBeVisible()
      expect(screen.queryByText(bn.right)).toBeNull()
      expect(screen.getByText('Hello! Good morning.')).toBeVisible()
      // The answer has been seen, which is all Next asks for.
      expect(button(bn.next)).toBeEnabled()

      // Another sentence the admin listed is right too, and the tick goes when it is changed.
      await userEvent.clear(field())
      await userEvent.type(field(), 'Hi! Good morning.')
      await userEvent.click(button(bn.check))
      expect(screen.getByText(bn.right)).toBeVisible()
      await userEvent.type(field(), '!!x')
      expect(screen.queryByText(bn.right)).toBeNull()
    })

    it('shows the answer on request, and says it aloud', async () => {
      await openInBengali()

      await userEvent.click(button(bn.showAnswer))

      expect(screen.getByRole('heading', { level: 2, name: 'ইংরেজিতে' })).toBeVisible()
      expect(screen.getByText('Hello! Good morning.')).toBeVisible()
      expect(screen.queryByText(bn.compare)).toBeNull()
      expect(screen.queryByRole('button', { name: bn.showAnswer })).toBeNull()
      expect(button(bn.next)).toBeEnabled()

      await userEvent.click(button('উত্তরটি শুনুন'))
      expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
    })

    it('goes through the sentences one at a time, and finishes the day after the last', async () => {
      const router = await openInBengali()

      await userEvent.type(field(), 'something')
      await userEvent.click(button(bn.check))
      await userEvent.click(button(bn.next))

      // The second sentence starts afresh, and is announced by moving focus to the heading.
      expect(screen.getByText('৫টি বাক্যের মধ্যে বাক্য ২')).toBeVisible()
      expect(screen.getByText('আপনি কেমন আছেন?')).toBeVisible()
      expect(field()).toHaveValue('')
      expect(screen.queryByText('How are you?')).toBeNull()
      expect(button(bn.next)).toBeDisabled()
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()

      for (const sentence of [2, 3, 4, 5]) {
        expect(progress().doneDays, `before sentence ${sentence} is done`).toEqual({})
        await userEvent.click(button(bn.showAnswer))
        await userEvent.click(button(bn.next))
      }

      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({ 1: [3] })
    })

    it('reads the sentence out in Bengali when there is a voice for it', async () => {
      vi.mocked(hasVoiceFor).mockImplementation((language) => language === 'bn')
      await openInBengali()

      await userEvent.click(button('বাক্যটি শুনুন'))
      expect(speak).toHaveBeenLastCalledWith('হ্যালো! সুপ্রভাত।', { rate: 1, lang: 'bn' })
    })

    it('leaves Next open for a learner who finished the day before', async () => {
      useLessonProgressStore.setState({ doneDays: { 1: [3] } })
      await openInBengali()
      expect(button(bn.next)).toBeEnabled()
    })
  })

  describe('for a learner with no language to translate from', () => {
    it('gives the English to listen to and say, with nothing locked', async () => {
      renderDay(day3)
      await step()

      expect(screen.getByText('Listen to the sentence, then say it.')).toBeVisible()
      expect(screen.getByText('Sentence 1 of 5')).toBeVisible()
      expect(screen.getByText('3/7')).toBeVisible()
      expect(screen.getByRole('progressbar', { name: 'Days of this week' })).toHaveAttribute(
        'aria-valuenow',
        '43',
      )

      const card = screen.getByRole('region', { name: 'Sentence' })
      expect(within(card).getByText('Hello! Good morning.')).toHaveAttribute('lang', 'en')
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getByText('Say “Good morning” before noon.').closest('ul')).toHaveAttribute(
        'lang',
        'en',
      )
      expect(next()).toBeEnabled()

      await userEvent.click(within(card).getByRole('button', { name: 'Listen to the sentence' }))
      expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
    })

    it('says so when the device fails to play the sentence', async () => {
      vi.mocked(speak).mockRejectedValue(new Error('no voice'))
      renderDay(day3)
      await step()

      await userEvent.click(button('Listen to the sentence'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The sentence cannot be played right now. Read it, then say it.',
      )
    })

    it('offers no speaker on a device with no speech at all', async () => {
      vi.mocked(isSpeechSupported).mockReturnValue(false)
      renderDay(day3)
      await step()
      expect(screen.queryByRole('button', { name: 'Listen to the sentence' })).toBeNull()
    })
  })

  describe('saying the sentence', () => {
    it('explains the microphone first, records on a tap, and forgets the take on Next', async () => {
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      renderDay(day3)
      await step()

      expect(screen.getByRole('heading', { level: 2, name: 'Say it in English' })).toBeVisible()
      expect(
        screen.getByText('We will ask to use your microphone. Your recording is not saved.'),
      ).toBeVisible()
      expect(startRecording).not.toHaveBeenCalled()

      await userEvent.click(button('Tap to speak'))
      expect(await screen.findByText(/^Recording…/)).toBeVisible()
      await userEvent.click(button('Stop recording'))
      expect(await screen.findByText('Recorded. Listen, or try again.')).toBeVisible()
      await userEvent.click(button('Listen to yourself'))
      expect(play).toHaveBeenCalledOnce()

      await userEvent.click(next())
      expect(screen.getByText('Sentence 2 of 5')).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Listen to yourself' })).toBeNull()
      play.mockRestore()
    })

    it('explains a blocked microphone, which holds nobody back', async () => {
      vi.mocked(startRecording).mockRejectedValue(new MicrophoneError('denied'))
      await openInBengali()

      await userEvent.click(button('বলতে ট্যাপ করুন'))
      expect(await screen.findByRole('alert')).toBeVisible()

      await userEvent.click(button(bn.showAnswer))
      expect(button(bn.next)).toBeEnabled()
    })

    describe('having the recording checked', () => {
      const record = async (start = 'Tap to speak', stop = 'Stop recording') => {
        await userEvent.click(button(start))
        await userEvent.click(await screen.findByRole('button', { name: stop }))
        await screen.findByRole('button', { name: /Listen to yourself|নিজের কণ্ঠ শুনুন/ })
      }
      const found = () => screen.findByRole('region', { name: 'How it sounded' })

      beforeEach(() => {
        vi.mocked(canMakeWav).mockReturnValue(true)
        vi.stubGlobal(
          'fetch',
          vi.fn(async () => new Response('voice')),
        )
      })
      afterEach(() => vi.unstubAllGlobals())

      it('checks the sentence on show, and names the words that sounded different', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'soundDiffers', confidence: 0.8, words: ['Good', 'morning'] }],
        })
        renderDay(day3)
        await step()
        await record()

        await userEvent.click(button('Check how I said it'))
        const region = await found()

        // The sentence as it is written, whole: its parts are not a lesson's to write.
        expect(checkPronunciation).toHaveBeenCalledExactlyOnceWith(wav, {
          word: 'Hello! Good morning.',
          syllables: [],
          stress: null,
        })
        expect(region).toHaveTextContent(
          'These words sounded a little different: Good, morning. Listen again and compare.',
        )
        expect(within(region).getByText('morning')).toHaveAttribute('lang', 'en')
        expect(region).toHaveTextContent('This check is new and can be wrong.')
        // Nothing is drawn of a sentence: it has no parts to draw.
        expect(within(region).queryByRole('img')).toBeNull()

        // A sentence is not "the word".
        expect(within(region).queryByRole('button', { name: 'Hear the word' })).toBeNull()
        await userEvent.click(within(region).getByRole('button', { name: 'Hear the sentence' }))
        expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
        expect(within(region).getByRole('button', { name: 'Hear yourself' })).toBeVisible()
      })

      it('says a sentence sounded different when no word of it can be named, and when it was right', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'soundDiffers', confidence: 0.8 }],
        })
        renderDay(day3)
        await step()
        await record()
        await userEvent.click(button('Check how I said it'))
        expect(await found()).toHaveTextContent(
          'Some of it sounded a little different. Listen to the sentence again and compare.',
        )

        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'ok', confidence: 1 }],
        })
        await record()
        await userEvent.click(button('Check how I said it'))
        await waitFor(async () =>
          expect(await found()).toHaveTextContent('That sounded right. Well done!'),
        )
      })

      it('says the sentence, not the word, is to be recorded again when it could not be read', async () => {
        vi.mocked(recordingToWav).mockRejectedValue(new Error('cannot decode'))
        renderDay(day3)
        await step()
        await record()
        await userEvent.click(button('Check how I said it'))

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'This recording could not be checked. Record the sentence again.',
        )
      })

      it('checks only what was said with the English on show: before that it may be another sentence', async () => {
        const check = 'আমি কেমন বললাম দেখুন'
        const sayAgain = 'পরীক্ষা করাতে চাইলে, বাক্যটি এখন দেখে আরেকবার বলুন।'
        await openInBengali()

        // Translating in their head, they say something: perhaps "Hi! Good morning.", which is right.
        await record('বলতে ট্যাপ করুন', 'রেকর্ডিং থামান')
        expect(screen.queryByRole('button', { name: check })).toBeNull()
        expect(screen.queryByText(sayAgain)).toBeNull()

        // The answer comes on show. That recording is still not held against it.
        await userEvent.click(button(bn.showAnswer))
        expect(screen.queryByRole('button', { name: check })).toBeNull()
        expect(screen.getByText(sayAgain)).toBeVisible()

        // Said again, seeing it: now it can be checked.
        await record('বলতে ট্যাপ করুন', 'রেকর্ডিং থামান')
        expect(button(check)).toBeVisible()
        expect(screen.queryByText(sayAgain)).toBeNull()
        expect(checkPronunciation).not.toHaveBeenCalled()
      })

      it('forgets what was found with the sentence it was found in', async () => {
        vi.mocked(checkPronunciation).mockResolvedValue({
          findings: [{ code: 'ok', confidence: 1 }],
        })
        renderDay(day3)
        await step()
        await record()
        await userEvent.click(button('Check how I said it'))
        await found()

        await userEvent.click(next())
        expect(screen.getByText('Sentence 2 of 5')).toBeVisible()
        expect(screen.queryByRole('region', { name: 'How it sounded' })).toBeNull()
        expect(screen.queryByRole('button', { name: 'Check how I said it' })).toBeNull()
      })
    })
  })

  describe('with what an admin set', () => {
    const written = {
      sentences: [
        {
          english: 'I’d like a coffee, please.',
          alsoAccepted: [],
          translations: { hi: 'मुझे एक कॉफ़ी चाहिए।' },
          tips: { en: ['Say “please” at the end.'] },
        },
      ],
    }

    it('opens the day for a week once it has sentences', async () => {
      renderDay('/lessons/weeks/2/days/3')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 3' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_SENTENCES_CONFIG_NAME, { 2: written }))
      await step()
      expect(screen.getByText('I’d like a coffee, please.')).toBeVisible()
      // One sentence needs no "1 of 1".
      expect(screen.queryByText(/^Sentence \d/)).toBeNull()
    })

    it('takes the long form of a short one for the same answer, in a regional language too', async () => {
      settingsRepository.write(WEEK_SENTENCES_CONFIG_NAME, { 1: written })
      useLanguageStore.setState({ language: 'hi-IN' })
      renderDay(day3)
      await screen.findByRole('heading', { level: 1, name: 'अनुवाद करें और बोलें' })

      expect(screen.getByText('मुझे एक कॉफ़ी चाहिए।')).toBeVisible()
      await userEvent.type(
        screen.getByRole('textbox', { name: 'आपका अनुवाद' }),
        'I would like a coffee please{Enter}',
      )
      expect(screen.getByText('बिल्कुल सही। बहुत बढ़िया!')).toBeVisible()
    })

    it('gives a sentence not written in the learner’s language as English to say, tips in English', async () => {
      settingsRepository.write(WEEK_SENTENCES_CONFIG_NAME, { 1: written })
      await openInBengali()

      expect(screen.getByText('বাক্যটি শুনুন, তারপর বলুন।')).toBeVisible()
      expect(screen.getByText('I’d like a coffee, please.')).toHaveAttribute('lang', 'en')
      expect(screen.queryByRole('textbox')).toBeNull()
      expect(screen.getByText('Say “please” at the end.').closest('ul')).toHaveAttribute(
        'lang',
        'en',
      )
      expect(button(bn.next)).toBeEnabled()
    })
  })
})

describe('Day 4: a role-play', () => {
  const day4 = '/lessons/weeks/1/days/4'
  const step = () => screen.findByRole('heading', { level: 1, name: 'Talk to Ravi' })
  const button = (name: string | RegExp) => screen.getByRole('button', { name })
  const said = () =>
    within(screen.getByRole('list', { name: 'Conversation' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  const start = async (path = day4) => {
    const router = renderDay(path)
    await step()
    await userEvent.click(button('Start the conversation'))
    return router
  }
  /** Say something into the microphone and stop: the learner's answer to the turn. */
  const answer = async () => {
    await userEvent.click(button('Tap to speak'))
    await screen.findByText(/^Recording…/)
    await userEvent.click(button('Stop recording'))
  }

  it('waits for a tap before anyone speaks, and explains the microphone first', async () => {
    renderDay(day4)
    await step()

    expect(screen.getByText('Practise a conversation. Speak when it is your turn.')).toBeVisible()
    expect(screen.getByText('4/7')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Days of this week' })).toHaveAttribute(
      'aria-valuenow',
      '57',
    )
    expect(
      screen.getByText('We will ask to use your microphone. Your recording is not saved.'),
    ).toBeVisible()
    expect(button('Start the conversation')).toBeVisible()
    expect(screen.queryByRole('list', { name: 'Conversation' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(speak).not.toHaveBeenCalled()
    expect(startRecording).not.toHaveBeenCalled()
  })

  it('has the learner’s own tutor play the partner, whose voice it is that speaks', async () => {
    renderDay(day4)
    await step()

    // A drawn face, smiling until it speaks: the one chosen in Profile, not a stand-in figure.
    const face = document.querySelector('[data-mood]')
    expect(face).toHaveAttribute('data-mood', 'smile')
    expect(face).toHaveAttribute('data-mouth', 'rest')
    // Decoration: the heading names who is being talked to.
    expect(face?.querySelector('[role="img"]')).toBeNull()
  })

  it('keeps the partner’s face, the way back and the day’s place in the week in view, above what scrolls', async () => {
    const face = () => document.querySelector('[data-mood]')
    const scrolls = () => screen.getByRole('main')
    const stays = (element: Element | null) => element !== null && !scrolls().contains(element)
    renderDay(day4)
    await step()

    // Before the conversation starts, and from then on: the face does not move between them.
    for (const begun of [false, true]) {
      if (begun) await userEvent.click(button('Start the conversation'))
      expect(stays(face())).toBe(true)
      expect(stays(screen.getByRole('link', { name: 'Back to the week' }))).toBe(true)
      expect(stays(screen.getByRole('progressbar', { name: 'Days of this week' }))).toBe(true)
      expect(stays(screen.getByRole('link', { name: 'Go back to Day 3' }))).toBe(true)
      expect(stays(screen.getByText('4/7'))).toBe(true)
      // Under it, and scrolling: who is being talked to, and the conversation.
      expect(scrolls()).toContainElement(screen.getByRole('heading', { level: 1 }))
    }
    expect(scrolls()).toContainElement(screen.getByRole('list', { name: 'Conversation' }))
  })

  it('calls the partner what fits the tutor who plays them: Ravi from a man, Asha from a woman', async () => {
    useTutorAvatarStore.setState({ avatar: 'female' })
    renderDay(day4)
    expect(await screen.findByRole('heading', { level: 1, name: 'Talk to Asha' })).toBeVisible()
    expect(screen.queryByText(/Ravi/)).toBeNull()

    await userEvent.click(button('Start the conversation'))
    expect(said()).toEqual(['AshaHello! Good morning.'])
    await userEvent.click(button('Skip this turn'))
    await userEvent.click(button('Skip this turn'))

    // A woman's voice does not introduce itself by a man's name: the line says hers.
    expect(speak).toHaveBeenLastCalledWith('I’m good, thanks. My name is Asha. What’s your name?', {
      rate: 1,
    })
    expect(screen.getByText('I’m good, thanks. My name is Asha. What’s your name?')).toBeVisible()
    expect(screen.queryByText(/Ravi/)).toBeNull()
  })

  it('shows the learner’s own picture on their side of the conversation, still, or a plain figure', async () => {
    // The only picture a conversation can hold: the partner's lines have none beside them.
    const mine = () => screen.getByRole('list', { name: 'Conversation' }).querySelector('img')
    await start()
    await userEvent.click(button('Skip this turn'))

    // No picture of their own: a figure, and nothing asked of the network.
    expect(said()[1]).toBe('You could sayGood morning!')
    expect(mine()).toBeNull()

    act(() => useProfilePhotoStore.setState({ photo: 'data:image/png;base64,AAAA' }))
    expect(mine()).toHaveAttribute('src', 'data:image/png;base64,AAAA')
    // Decoration: the line beside it says whose turn it was.
    expect(mine()).toHaveAttribute('alt', '')
  })

  it('opens with the partner’s first line, said aloud and written out, then it is the learner’s turn', async () => {
    await start()

    expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
    expect(said()).toEqual(['RaviHello! Good morning.'])
    expect(screen.getByText('Hello! Good morning.')).toHaveAttribute('lang', 'en')
    expect(await screen.findByText('Your turn. Tap to speak.')).toBeVisible()
    // What to answer is not given away.
    expect(screen.queryByText('Good morning!')).toBeNull()
    expect(startRecording).not.toHaveBeenCalled()
  })

  it('says who is speaking while the partner’s line is being said', async () => {
    let finish: (outcome: 'ended') => void = () => {}
    vi.mocked(speak).mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    await start()

    expect(screen.getByText('Ravi is speaking…')).toBeVisible()
    expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'true')

    await act(async () => finish('ended'))
    expect(screen.getByText('Your turn. Tap to speak.')).toBeVisible()
    expect(screen.getAllByRole('listitem')[0]).not.toHaveAttribute('aria-current')
  })

  it('goes on to the partner’s next line when the learner has spoken, and shows a reply they could have given', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    await start()

    await answer()

    expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 })
    expect(said()).toEqual([
      'RaviHello! Good morning.',
      'You could sayGood morning!',
      'RaviHow are you?',
    ])
    // Their own recording stays with the turn it answered, until another answer replaces it.
    await userEvent.click(await screen.findByRole('button', { name: 'Listen to yourself' }))
    expect(play).toHaveBeenCalledOnce()
    await userEvent.click(button('Tap to speak'))
    await screen.findByText(/^Recording…/)
    expect(button('Listen to yourself')).toBeVisible()
    await userEvent.click(button('Stop recording'))

    // It has moved to the second answer: the last of the two "You could say" bubbles.
    const answers = () =>
      within(screen.getByRole('list', { name: 'Conversation' }))
        .getAllByRole('listitem')
        .filter((item) => item.textContent.startsWith('You could say'))
    await waitFor(() =>
      expect(
        within(answers().at(-1) ?? document.body).getByRole('button', {
          name: 'Listen to yourself',
        }),
      ).toBeVisible(),
    )
    expect(answers()).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Listen to yourself' })).toHaveLength(1)
    play.mockRestore()
  })

  describe('taking turns without tapping', () => {
    /** What the device makes of the microphone's sound, as the test tells it. */
    let report: (reading: VoiceReading) => void = () => {}
    let clockAhead: ReturnType<typeof vi.spyOn> | null = null

    /** A device that can tell whether someone is speaking. */
    const hearing = () => {
      vi.mocked(canListenForVoice).mockReturnValue(true)
      vi.mocked(listenForVoice).mockImplementation((_stream, onReading) => {
        report = onReading
        return () => {}
      })
    }
    /** A browser that has been given the microphone before, on such a device. */
    const allowed = () => {
      vi.mocked(microphoneAllowed).mockReturnValue(true)
      hearing()
    }
    /** Time passes; the recording under way notices on its next tick. */
    const later = (ms: number) => {
      const now = performance.now()
      clockAhead?.mockRestore()
      clockAhead = vi.spyOn(performance, 'now').mockReturnValue(now + ms)
    }
    /** The learner is speaking right now. */
    const speaking = () => report({ heard: true, lastVoiceAt: performance.now() })

    afterEach(() => {
      clockAhead?.mockRestore()
      clockAhead = null
    })

    it('opens the microphone by itself after the partner’s line, and counts down the time to begin', async () => {
      allowed()
      await start()

      expect(await screen.findByText('Start speaking now')).toBeVisible()
      expect(startRecording).toHaveBeenCalledOnce()
      // A turn may run for two minutes; the recorder's own limit is only a backstop.
      expect(startRecording).toHaveBeenCalledWith({ maxDurationMs: 122_000 })
      expect(screen.getByText('5')).toBeVisible()
      expect(button('Stop recording')).toBeVisible()
    })

    it('never opens it by itself until the browser allows the microphone, but a tap follows the same rules', async () => {
      hearing()
      await start()

      expect(await screen.findByText('Your turn. Tap to speak.')).toBeVisible()
      expect(startRecording).not.toHaveBeenCalled()

      await userEvent.click(button('Tap to speak'))
      expect(await screen.findByText('Start speaking now')).toBeVisible()
      expect(screen.getByText('5')).toBeVisible()
    })

    it('leaves the microphone to a tap on a device that cannot tell whether anyone speaks', async () => {
      vi.mocked(microphoneAllowed).mockReturnValue(true)
      await start()

      expect(await screen.findByText('Your turn. Tap to speak.')).toBeVisible()
      expect(startRecording).not.toHaveBeenCalled()

      // Tapped, it records as before: no countdown that the device could not end.
      await userEvent.click(button('Tap to speak'))
      expect(await screen.findByText(/^Recording…/)).toBeVisible()
      expect(screen.queryByText('Start speaking now')).toBeNull()
    })

    it('shuts the microphone when nothing is said in five seconds, and the turn waits', async () => {
      allowed()
      await start()
      await screen.findByText('Start speaking now')

      later(5100)

      expect(await screen.findByText('Your turn. Tap to speak.')).toBeVisible()
      expect(button('Tap to speak')).toBeVisible()
      expect(screen.queryByText('5')).toBeNull()
      // Nothing was said, so the conversation has not moved.
      expect(said()).toHaveLength(1)
      expect(speak).toHaveBeenCalledOnce()
    })

    it('drops the countdown when the learner speaks, and takes a pause of three seconds as their answer', async () => {
      allowed()
      await start()
      await screen.findByText('Start speaking now')

      speaking()
      expect(await screen.findByText(/^Recording…/)).toBeVisible()
      expect(screen.queryByText('5')).toBeNull()
      expect(said()).toHaveLength(1)

      later(3100)

      await waitFor(() => expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 }))
      expect(said()).toEqual([
        'RaviHello! Good morning.',
        'You could sayGood morning!',
        'RaviHow are you?',
      ])
    })

    it('counts down the last twenty seconds of a turn, then hands it to the partner', async () => {
      allowed()
      await start()
      await screen.findByText('Start speaking now')

      later(105_000)
      speaking()
      expect(await screen.findByText('Time is almost up')).toBeVisible()
      expect(screen.getByText('15')).toBeVisible()
      expect(said()).toHaveLength(1)

      later(15_000)
      speaking()
      await waitFor(() => expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 }))
      expect(said()).toHaveLength(3)
    })

    it('keeps the learner’s last answer to listen to when the microphone shuts on the next turn', async () => {
      const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
      allowed()
      await start()
      await screen.findByText('Start speaking now')
      speaking()
      await screen.findByText(/^Recording…/)
      later(3100)
      // The second turn's microphone opens by itself too.
      await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(2))
      await screen.findByText('Start speaking now')

      later(5100)

      await screen.findByText('Your turn. Tap to speak.')
      await userEvent.click(button('Listen to yourself'))
      expect(play).toHaveBeenCalledOnce()
      play.mockRestore()
    })

    it('closes the microphone while the learner decides whether to leave', async () => {
      allowed()
      await start()
      await screen.findByText('Start speaking now')

      await userEvent.click(button('End chat'))
      expect(screen.getByRole('heading', { level: 2, name: 'End the conversation?' })).toBeVisible()
      await userEvent.click(button('Keep talking'))

      expect(screen.getByText('Your turn. Tap to speak.')).toBeVisible()
      expect(said()).toHaveLength(1)
    })

    it('closes the microphone that opened for the next turn when the learner turns to what they said', async () => {
      vi.mocked(canMakeWav).mockReturnValue(true)
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('voice')),
      )
      vi.mocked(checkReply).mockResolvedValue({ heard: 'Good morning.', fits: true, better: null })
      allowed()
      await start()
      await screen.findByText('Start speaking now')
      speaking()
      await screen.findByText(/^Recording…/)
      later(3100)
      // The second turn's microphone opens by itself.
      await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(2))

      await userEvent.click(await screen.findByRole('button', { name: 'Check my reply' }))

      // They are reading about their last answer, not giving the next one: it waits for a tap.
      expect(await screen.findByRole('region', { name: 'About your reply' })).toBeVisible()
      expect(screen.getByText('Your turn. Tap to speak.')).toBeVisible()
      expect(said()).toHaveLength(3)
      vi.unstubAllGlobals()
    })
  })

  describe('having a reply checked', () => {
    const checkButton = () => screen.queryByRole('button', { name: 'Check my reply' })
    const askToCheck = async () =>
      userEvent.click(await screen.findByRole('button', { name: 'Check my reply' }))
    const found = () => screen.findByRole('region', { name: 'About your reply' })

    beforeEach(() => {
      vi.mocked(canMakeWav).mockReturnValue(true)
      // The take is kept by an address in the page's memory; these are its bytes.
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('voice')),
      )
    })
    afterEach(() => vi.unstubAllGlobals())

    it('is not offered on a device that cannot send its recording', async () => {
      vi.mocked(canMakeWav).mockReturnValue(false)
      await start()
      await answer()

      expect(await screen.findByRole('button', { name: 'Listen to yourself' })).toBeVisible()
      expect(checkButton()).toBeNull()
    })

    it('is not offered for a turn that was skipped: there is nothing to send', async () => {
      await start()
      await userEvent.click(button('Skip this turn'))

      expect(said()).toHaveLength(3)
      expect(checkButton()).toBeNull()
    })

    it('sends nothing until the learner asks, then says what was heard and that nothing was found', async () => {
      vi.mocked(checkReply).mockResolvedValue({ heard: 'Good morning.', fits: true, better: null })
      await start()
      await answer()

      expect(await screen.findByRole('button', { name: 'Check my reply' })).toBeVisible()
      expect(
        screen.getByText('Sends this recording to our server to be checked. It is not kept.'),
      ).toBeVisible()
      expect(checkReply).not.toHaveBeenCalled()

      await askToCheck()
      const region = await found()
      // As a WAV, with the line it answers and the reply the lesson suggests.
      expect(recordingToWav).toHaveBeenCalledOnce()
      expect(checkReply).toHaveBeenCalledExactlyOnceWith(wav, {
        partner: 'Hello! Good morning.',
        suggested: 'Good morning!',
      })
      expect(region).toHaveTextContent('We heard')
      expect(within(region).getByText('Good morning.')).toHaveAttribute('lang', 'en')
      expect(region).toHaveTextContent('We found nothing to change.')
      // Every time: nothing has measured it on learners yet.
      expect(region).toHaveTextContent('This check is new and can be wrong.')
      // That reply has been checked.
      expect(checkButton()).toBeNull()
      // The conversation went on meanwhile, whatever was found.
      expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 })
    })

    it('offers a better way to say it, and calls nothing wrong', async () => {
      vi.mocked(checkReply).mockResolvedValue({
        heard: 'Morning good.',
        fits: true,
        better: 'Good morning.',
      })
      await start()
      await answer()
      await askToCheck()

      const region = await found()
      expect(region).toHaveTextContent('We heardMorning good.')
      // A model's yes is not praise: nothing is said of whether it answers unless there is a doubt.
      expect(region).not.toHaveTextContent('Ravi')
      expect(region).not.toHaveTextContent('We found nothing to change.')
      expect(region).toHaveTextContent('You could say it like thisGood morning.')
      expect(region).not.toHaveTextContent(/mistake|incorrect|not quite/i)
    })

    it('says, as a doubt, when a reply may not answer the partner', async () => {
      vi.mocked(checkReply).mockResolvedValue({ heard: 'I am fine.', fits: false, better: null })
      await start()
      await answer()
      await askToCheck()

      const region = await found()
      expect(region).toHaveTextContent(
        'This may not answer what Ravi said. Compare it with the reply above.',
      )
      expect(region).not.toHaveTextContent('We found nothing to change.')
    })

    it('says when no words could be made out', async () => {
      vi.mocked(checkReply).mockResolvedValue({ heard: null, fits: null, better: null })
      await start()
      await answer()
      await askToCheck()

      const region = await found()
      expect(region).toHaveTextContent('We could not make out the words.')
      expect(region).not.toHaveTextContent('We heard')
    })

    it('keeps what was found with its turn after the recording has gone to the next answer', async () => {
      vi.mocked(checkReply).mockResolvedValue({ heard: 'Good morning.', fits: true, better: null })
      await start()
      await answer()
      await askToCheck()
      await found()

      await answer()

      // The second answer can be checked now; the first one's result is still under it.
      expect(await screen.findByRole('button', { name: 'Check my reply' })).toBeVisible()
      const regions = screen.getAllByRole('region', { name: 'About your reply' })
      expect(regions).toHaveLength(1)
      expect(said()[1]).toContain('We found nothing to change.')

      await askToCheck()
      await waitFor(() =>
        expect(screen.getAllByRole('region', { name: 'About your reply' })).toHaveLength(2),
      )
      expect(checkReply).toHaveBeenLastCalledWith(wav, {
        partner: 'How are you?',
        suggested: 'I’m fine, thank you. And you?',
      })
    })

    it('says so when it cannot be checked right now, and can be asked again', async () => {
      vi.mocked(checkReply).mockRejectedValueOnce(new Error('offline'))
      vi.mocked(checkReply).mockResolvedValue({ heard: 'Good morning.', fits: true, better: null })
      await start()
      await answer()
      await askToCheck()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Your reply cannot be checked right now. You can still listen to yourself.',
      )
      await askToCheck()
      expect(await found()).toHaveTextContent('We found nothing to change.')
      expect(screen.queryByRole('alert')).toBeNull()
    })

    it('starts again without what was found the time before', async () => {
      vi.mocked(checkReply).mockResolvedValue({ heard: 'Good morning.', fits: true, better: null })
      await start()
      await answer()
      await askToCheck()
      await found()
      for (let turn = 0; turn < 4; turn += 1) await userEvent.click(button('Skip this turn'))

      await userEvent.click(button('Practise again'))

      expect(screen.queryByRole('region', { name: 'About your reply' })).toBeNull()
      expect(said()).toHaveLength(1)
    })
  })

  it('lets a turn be skipped, so speaking is never a condition', async () => {
    await start()

    await userEvent.click(button('Skip this turn'))

    expect(startRecording).not.toHaveBeenCalled()
    expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 })
    expect(said()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Listen to yourself' })).toBeNull()
  })

  it('says a line again on request: the partner’s, or a reply already passed', async () => {
    await start()
    await userEvent.click(button('Skip this turn'))

    await userEvent.click(button('Listen again: Hello! Good morning.'))
    expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
    await userEvent.click(button('Listen to this reply: Good morning!'))
    expect(speak).toHaveBeenLastCalledWith('Good morning!', { rate: 1 })
    // Hearing something again moves nothing on.
    expect(said()).toHaveLength(3)
  })

  describe('the hint', () => {
    it('gives the English at once to a learner with no other language', async () => {
      await start()

      await userEvent.click(button('Hint'))

      expect(said()).toEqual(['RaviHello! Good morning.', 'What to sayGood morning!'])
      expect(button('Hint')).toBeDisabled()
      await userEvent.click(button('Listen to this reply: Good morning!'))
      expect(speak).toHaveBeenLastCalledWith('Good morning!', { rate: 1 })
    })

    it('tells a Bengali learner what to say first, and the English only when asked again', async () => {
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day4)
      await screen.findByRole('heading', { level: 1, name: 'Ravi-এর সঙ্গে কথা বলুন' })
      await userEvent.click(button('কথোপকথন শুরু করুন'))

      await userEvent.click(button('ইঙ্গিত'))
      expect(screen.getByText('তাঁকে সুপ্রভাত জানান।')).toHaveAttribute('lang', 'bn')
      expect(screen.queryByText('Good morning!')).toBeNull()

      await userEvent.click(button('আরও সাহায্য'))
      expect(screen.getByText('তাঁকে সুপ্রভাত জানান।')).toBeVisible()
      expect(screen.getByText('Good morning!')).toHaveAttribute('lang', 'en')
      expect(button('ইঙ্গিত')).toBeDisabled()

      // The next turn starts without help.
      await userEvent.click(button('এই পালা বাদ দিন'))
      expect(button('ইঙ্গিত')).toBeEnabled()
      expect(screen.queryByText('যা বলবেন')).toBeNull()
    })
  })

  it('finishes the conversation after the last turn, and only then offers Next', async () => {
    const router = await start()

    for (const turn of [1, 2, 3, 4]) {
      await userEvent.click(button('Skip this turn'))
      expect(screen.queryByRole('button', { name: 'Next' }), `after turn ${turn}`).toBeNull()
    }
    expect(speak).toHaveBeenLastCalledWith('See you later. Goodbye!', { rate: 1 })
    await answer()

    expect(await screen.findByText('Well done! You finished the conversation.')).toBeVisible()
    expect(said()).toHaveLength(10)
    expect(said().at(-1)).toBe('You could sayGoodbye! Have a nice day.')
    expect(screen.queryByRole('button', { name: 'Skip this turn' })).toBeNull()
    expect(progress().doneDays).toEqual({})

    await userEvent.click(next())
    expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/home/weeks/1')
    expect(progress().doneDays).toEqual({ 1: [4] })
  })

  it('starts over on "Practise again"', async () => {
    await start()
    for (let turn = 0; turn < 5; turn += 1) await userEvent.click(button('Skip this turn'))

    await userEvent.click(button('Practise again'))

    expect(speak).toHaveBeenLastCalledWith('Hello! Good morning.', { rate: 1 })
    expect(said()).toEqual(['RaviHello! Good morning.'])
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })

  describe('End chat', () => {
    it('asks first, and "Keep talking" changes nothing', async () => {
      await start()
      await userEvent.click(button('Skip this turn'))

      await userEvent.click(button('End chat'))

      expect(screen.getByRole('heading', { level: 2, name: 'End the conversation?' })).toBeVisible()
      expect(cancelSpeech).toHaveBeenCalled()
      expect(button('Keep talking')).toHaveFocus()

      await userEvent.click(button('Keep talking'))
      expect(said()).toHaveLength(3)
      expect(button('Skip this turn')).toBeVisible()
    })

    it('leaves for the week without finishing the day', async () => {
      const router = await start()
      await userEvent.click(button('End chat'))

      await userEvent.click(screen.getByRole('link', { name: 'End chat' }))

      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({})
    })
  })

  describe('on a device that cannot do everything', () => {
    it('explains a blocked microphone, and the turn can still be skipped', async () => {
      vi.mocked(startRecording).mockRejectedValue(new MicrophoneError('denied'))
      await start()

      await userEvent.click(button('Tap to speak'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The microphone is blocked for this app.',
      )
      // Nothing was said, so the conversation has not moved.
      expect(said()).toHaveLength(1)

      await userEvent.click(button('Skip this turn'))
      expect(said()).toHaveLength(3)
    })

    it('says so when the lines cannot be said aloud, and goes on in writing', async () => {
      vi.mocked(speak).mockRejectedValue(new Error('no voice'))
      await start()

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The lines cannot be said aloud right now. Read them, then answer.',
      )
      await userEvent.click(button('Skip this turn'))
      expect(said()).toHaveLength(3)
    })

    it('offers no buttons to hear lines on a device with no speech at all', async () => {
      vi.mocked(isSpeechSupported).mockReturnValue(false)
      await start()

      expect(screen.getByRole('alert')).toBeVisible()
      expect(screen.queryByRole('button', { name: /^Listen again/ })).toBeNull()
      expect(said()).toEqual(['RaviHello! Good morning.'])
    })
  })

  describe('with what an admin set', () => {
    const written = {
      partner: 'the barista',
      imageUrl: '/people/barista.webp',
      turns: [
        { partner: 'Hi! Welcome!', reply: 'Hello!', cues: {} },
        { partner: 'What would you like today?', reply: 'I’d like a coffee, please.', cues: {} },
      ],
    }

    it('opens the day for a week once it has a role-play, with their partner and picture', async () => {
      renderDay('/lessons/weeks/2/days/4')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 4' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_ROLEPLAYS_CONFIG_NAME, { 2: written }))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Talk to the barista' }),
      ).toBeVisible()
      // In the band that stays, where the tutor would be: not in what scrolls.
      const picture = document.querySelector('img') as HTMLImageElement
      expect(picture).toHaveAttribute('src', '/people/barista.webp')
      expect(screen.getByRole('main')).not.toContainElement(picture)

      // A picture that fails to load gives way to the learner's tutor, in the same place.
      fireEvent.error(picture)
      expect(document.querySelector('img')).toBeNull()
      const face = document.querySelector<HTMLElement>('[data-mood]')
      expect(face).not.toBeNull()
      expect(screen.getByRole('main')).not.toContainElement(face)

      await userEvent.click(button('Start the conversation'))
      expect(said()).toEqual(['the baristaHi! Welcome!'])
    })

    it('gives a Bengali learner the English at once when a turn has no cue in Bengali', async () => {
      settingsRepository.write(WEEK_ROLEPLAYS_CONFIG_NAME, { 1: written })
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day4)
      await screen.findByRole('heading', { level: 1, name: 'the barista-এর সঙ্গে কথা বলুন' })
      await userEvent.click(button('কথোপকথন শুরু করুন'))

      await userEvent.click(button('ইঙ্গিত'))
      expect(screen.getByText('Hello!')).toHaveAttribute('lang', 'en')
      expect(button('ইঙ্গিত')).toBeDisabled()
    })
  })
})

describe('Day 5: the week’s challenge', () => {
  const day5 = '/lessons/weeks/1/days/5'
  const step = () => screen.findByRole('heading', { level: 1, name: 'First meeting challenge' })
  const button = (name: string | RegExp) => screen.getByRole('button', { name })
  const tasks = () =>
    within(screen.getByRole('list', { name: 'What to do' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  const week1Tasks = [
    'Greet the person',
    'Ask how they are',
    'Say your name',
    'Ask their name',
    'Say goodbye',
  ]
  /** One attempt: record, then stop. */
  const record = async () => {
    await userEvent.click(button('Tap to speak'))
    await screen.findByText(/^Recording…/)
    await userEvent.click(button('Stop recording'))
    await screen.findByText('Recorded. Listen, or try again.')
  }

  it('shows what to do as a list with nothing ticked, no prompts, and a locked Next', async () => {
    renderDay(day5)
    await step()

    expect(
      screen.getByText('Meet someone new, from hello to goodbye. Try it on your own.'),
    ).toBeVisible()
    expect(screen.getByText('5/7')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: 'Days of this week' })).toHaveAttribute(
      'aria-valuenow',
      '71',
    )
    expect(tasks()).toEqual(week1Tasks)
    // A list to read, not boxes that look done or wait to be ticked.
    expect(screen.queryByRole('checkbox')).toBeNull()
    // Help is there to ask for, not on show.
    expect(button('I need help')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Useful phrases' })).toBeNull()

    expect(screen.getByRole('heading', { level: 2, name: 'Record your attempt' })).toBeVisible()
    expect(
      screen.getByText('We will ask to use your microphone. Your recording is not saved.'),
    ).toBeVisible()
    expect(next()).toBeDisabled()
    expect(next()).toHaveAccessibleDescription('Record yourself once to continue.')
    expect(startRecording).not.toHaveBeenCalled()
  })

  it('records one take with its time limit in view, then opens Next and offers the self-check', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    renderDay(day5)
    await step()

    await userEvent.click(button('Tap to speak'))
    expect(await screen.findByText(/^Recording… 0:0\d \/ 2:00$/)).toBeVisible()
    // The recorder is given the same limit, or its own shorter one would end the take.
    expect(startRecording).toHaveBeenCalledWith({ maxDurationMs: 120_000 })
    // While the attempt is under way there is nothing to judge yet.
    expect(screen.queryByRole('checkbox')).toBeNull()
    await userEvent.click(button('Stop recording'))

    expect(await screen.findByText('Recorded. Listen, or try again.')).toBeVisible()
    expect(screen.getByText('Listen to your recording and tick what you managed.')).toBeVisible()
    // The screen does not pretend the take went anywhere or was marked.
    expect(
      screen.getByText('Only you can hear this recording. It is not saved, sent or scored.'),
    ).toBeVisible()
    expect(screen.getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('checkbox', { name: 'Greet the person' })).not.toBeChecked()
    // Ticks are the learner's own business: Next does not wait for them.
    expect(next()).toBeEnabled()

    await userEvent.click(button('Listen to yourself'))
    expect(play).toHaveBeenCalledOnce()
    play.mockRestore()
  })

  it('lets the learner tick and untick what they managed, and starts afresh on a new take', async () => {
    renderDay(day5)
    await step()
    await record()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Greet the person' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Say goodbye' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Say goodbye' }))
    expect(screen.getByRole('checkbox', { name: 'Greet the person' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Say goodbye' })).not.toBeChecked()

    await record()
    expect(screen.getByRole('checkbox', { name: 'Greet the person' })).not.toBeChecked()
    // A second attempt does not lock what the first one opened.
    expect(next()).toBeEnabled()
  })

  it('ends a take that reaches the time limit', async () => {
    renderDay(day5)
    await step()
    await userEvent.click(button('Tap to speak'))
    await screen.findByText(/^Recording…/)

    const now = performance.now()
    const clockAhead = vi.spyOn(performance, 'now').mockReturnValue(now + 121_000)

    // The recorder notices on its next tick; allow for a machine busy with other test files.
    expect(
      await screen.findByText('Recorded. Listen, or try again.', {}, { timeout: 5000 }),
    ).toBeVisible()
    clockAhead.mockRestore()
  })

  it('finishes the day on Next and goes back to the week', async () => {
    const router = renderDay(day5)
    await step()
    await record()
    await userEvent.click(next())

    expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
    expect(router.state.location.pathname).toBe('/home/weeks/1')
    expect(progress().doneDays).toEqual({ 1: [5] })
  })

  describe('for a learner who cannot record', () => {
    it('opens Next on "I can’t record right now", without the microphone', async () => {
      renderDay(day5)
      await step()

      await userEvent.click(button('I can’t record right now'))

      expect(next()).toBeEnabled()
      expect(screen.queryByRole('button', { name: 'I can’t record right now' })).toBeNull()
      expect(screen.queryByRole('checkbox')).toBeNull()
      expect(startRecording).not.toHaveBeenCalled()
    })

    it('explains a blocked microphone, and opens Next by itself', async () => {
      vi.mocked(startRecording).mockRejectedValue(new MicrophoneError('denied'))
      renderDay(day5)
      await step()

      await userEvent.click(button('Tap to speak'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The microphone is blocked for this app.',
      )
      expect(next()).toBeEnabled()
    })

    it('leaves Next open for a learner who finished the day before', async () => {
      useLessonProgressStore.setState({ doneDays: { 1: [5] } })
      renderDay(day5)
      await step()
      expect(next()).toBeEnabled()
    })
  })

  describe('help', () => {
    const phrases = () =>
      within(screen.getByRole('list', { name: 'Useful phrases' })).getAllByRole('listitem')

    it('shows the week’s phrases when asked, says one on a tap, and can be put away', async () => {
      renderDay(day5)
      await step()

      await userEvent.click(button('I need help'))

      expect(button('I need help')).toHaveAttribute('aria-expanded', 'true')
      expect(phrases()).toHaveLength(6)
      expect(within(phrases()[1] as HTMLElement).getByText('How are you?')).toHaveAttribute(
        'lang',
        'en',
      )
      await userEvent.click(button('Listen to this phrase: How are you?'))
      expect(speak).toHaveBeenLastCalledWith('How are you?', { rate: 1 })
      // Asking for help opens nothing and costs nothing.
      expect(next()).toBeDisabled()

      await userEvent.click(button('I need help'))
      expect(screen.queryByRole('list', { name: 'Useful phrases' })).toBeNull()
    })

    it('keeps the device’s voice out of a take: no phrase can be played while recording', async () => {
      renderDay(day5)
      await step()
      await userEvent.click(button('I need help'))

      await userEvent.click(button('Tap to speak'))
      await screen.findByText(/^Recording…/)
      expect(phrases()).toHaveLength(6)
      expect(screen.queryByRole('button', { name: /^Listen to this phrase/ })).toBeNull()
    })

    it('says so when the device fails to say a phrase', async () => {
      vi.mocked(speak).mockRejectedValue(new Error('no voice'))
      renderDay(day5)
      await step()
      await userEvent.click(button('I need help'))

      await userEvent.click(button('Listen to this phrase: How are you?'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The phrases cannot be said aloud right now. Read them instead.',
      )
    })
  })

  it('tells a Bengali learner what to do in Bengali, with the phrases still in English', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderDay(day5)
    await screen.findByRole('heading', { level: 1, name: 'প্রথম পরিচয়ের চ্যালেঞ্জ' })

    const list = within(screen.getByRole('list', { name: 'যা করতে হবে' }))
    expect(list.getAllByRole('listitem')).toHaveLength(5)
    expect(list.getByText('শুভেচ্ছা জানান')).toHaveAttribute('lang', 'bn')

    await userEvent.click(screen.getByRole('button', { name: 'আমার সাহায্য দরকার' }))
    expect(screen.getByText('How are you?')).toHaveAttribute('lang', 'en')
  })

  describe('with what an admin set', () => {
    const written = {
      title: { text: 'Café challenge', translations: {} },
      instruction: { text: '', translations: {} },
      tasks: [
        { text: 'Greet the staff', translations: { bn: 'কর্মীদের শুভেচ্ছা জানান' } },
        { text: 'Order food and drink', translations: {} },
      ],
      phrases: [],
    }

    it('opens the day for a week once it has a challenge, over the week’s own picture', async () => {
      settingsRepository.write(WEEK_PICTURES_CONFIG_NAME, { 2: '/weeks/cafe.webp' })
      renderDay('/lessons/weeks/2/days/5')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 5' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_CHALLENGES_CONFIG_NAME, { 2: written }))
      expect(await screen.findByRole('heading', { level: 1, name: 'Café challenge' })).toBeVisible()
      expect(tasks()).toEqual(['Greet the staff', 'Order food and drink'])
      expect(document.querySelector('main img')).toHaveAttribute('src', '/weeks/cafe.webp')
      // No phrases were written, so there is no help to offer.
      expect(screen.queryByRole('button', { name: 'I need help' })).toBeNull()
    })

    it('falls back to English, marked as English, for what is not written in the learner’s language', async () => {
      settingsRepository.write(WEEK_CHALLENGES_CONFIG_NAME, { 1: written })
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day5)
      await screen.findByRole('heading', { level: 1, name: 'Café challenge' })

      expect(screen.getByText('কর্মীদের শুভেচ্ছা জানান')).toHaveAttribute('lang', 'bn')
      expect(screen.getByText('Order food and drink')).toHaveAttribute('lang', 'en')
    })
  })
})

describe('Day 6: the week’s review', () => {
  // Its role-play's partner was written as a woman, Meera: with a woman as the learner's
  // tutor, who plays her, she keeps that name.
  beforeEach(() => useTutorAvatarStore.setState({ avatar: 'female' }))

  const day6 = '/lessons/weeks/1/days/6'
  const list = () => screen.findByRole('heading', { level: 1, name: 'Weekly review' })

  it('names the role-play’s partner in its list as the role-play will: Mohan, from a man', async () => {
    useTutorAvatarStore.setState({ avatar: 'male' })
    renderDay(day6)
    await list()

    expect(screen.getByText('Talk to Mohan')).toBeVisible()
    expect(screen.queryByText('Talk to Meera')).toBeNull()
  })
  const button = (name: string | RegExp) => screen.getByRole('button', { name })
  const link = (name: string | RegExp) => screen.getByRole('link', { name })
  const activities = () =>
    within(screen.getByRole('list', { name: 'Activities' })).getAllByRole('link')
  /** Pick a choice of the question on screen and check it. */
  const answer = async (choice: string) => {
    await userEvent.click(screen.getByRole('radio', { name: choice }))
    await userEvent.click(button('Check'))
  }

  describe('the list', () => {
    it('offers the five activities, each a tap away, and says the day is optional', async () => {
      renderDay(day6)
      await list()

      expect(screen.getByText('Optional day')).toBeVisible()
      expect(screen.getByText('Let’s practise what you learned.')).toBeVisible()
      expect(screen.getByText('6/7')).toBeVisible()
      expect(link('Back to the week')).toHaveAttribute('href', '/home/weeks/1')

      expect(activities().map((activity) => activity.textContent)).toEqual([
        'Quick quiz Vocabulary and expressions',
        'Listening practice A new conversation',
        'Speaking practice Repeat the week’s challenge',
        'Vocabulary flashcards Key words: 6',
        'Mini role-play Talk to Meera',
      ])
      expect(activities().map((activity) => activity.getAttribute('href'))).toEqual([
        `${day6}?part=quiz`,
        `${day6}?part=listening`,
        `${day6}?part=speaking`,
        `${day6}?part=flashcards`,
        `${day6}?part=roleplay`,
      ])

      // "Start practice" leads to the first of them; nothing is done, so there is no "Next" yet.
      expect(link('Start practice')).toHaveAttribute('href', `${day6}?part=quiz`)
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
      expect(speak).not.toHaveBeenCalled()
      expect(startRecording).not.toHaveBeenCalled()
    })

    it('can be skipped: the day is finished and the week moves on', async () => {
      const router = renderDay(day6)
      await list()

      await userEvent.click(button('Skip this day'))

      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({ 1: [6] })
      expect(progress().reviewParts).toEqual({})
    })

    it('ticks what has been done, leads on to what has not, and opens Next after one', async () => {
      useLessonProgressStore.setState({ reviewParts: { 1: ['quiz', 'speaking'] } })
      const router = renderDay(day6)
      await list()

      expect(link('Quick quiz Vocabulary and expressions Done')).toBeVisible()
      expect(link('Speaking practice Repeat the week’s challenge Done')).toBeVisible()
      expect(link('Listening practice A new conversation')).toBeVisible()
      expect(link('Continue practice')).toHaveAttribute('href', `${day6}?part=listening`)
      expect(screen.queryByRole('button', { name: 'Skip this day' })).toBeNull()

      await userEvent.click(next())
      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({ 1: [6] })
    })

    it('offers only Next once everything has been done', async () => {
      useLessonProgressStore.setState({
        reviewParts: { 1: ['quiz', 'listening', 'speaking', 'flashcards', 'roleplay'] },
      })
      renderDay(day6)
      await list()

      expect(screen.queryByRole('link', { name: /practice$/ })).toBeNull()
      expect(next()).toBeEnabled()
    })

    it('shows the list for a part that does not exist', async () => {
      renderDay(`${day6}?part=nonsense`)
      expect(await list()).toBeVisible()
    })

    it('opens an activity from the list, and the back arrow returns to it', async () => {
      const router = renderDay(day6)
      await list()

      await userEvent.click(link('Start practice'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Quick quiz' })).toBeVisible()
      expect(router.state.location.search).toBe('?part=quiz')

      await userEvent.click(link('Back to the review'))
      expect(await list()).toBeVisible()
      expect(progress().reviewParts).toEqual({})
    })
  })

  describe('the quick quiz', () => {
    const quiz = `${day6}?part=quiz`
    const step = () => screen.findByRole('heading', { level: 1, name: 'Quick quiz' })
    const question = () => screen.getByRole('heading', { level: 2 })

    it('asks one question at a time, and Check waits for a choice', async () => {
      renderDay(quiz)
      await step()

      expect(screen.getByText('Question 1 of 5')).toBeVisible()
      expect(screen.getByText('6/7')).toBeVisible()
      expect(question()).toHaveTextContent('It is morning. How do you greet someone?')
      expect(screen.getAllByRole('radio').map((choice) => choice.getAttribute('value'))).toEqual(
        expect.arrayContaining(['Good morning.', 'Goodbye.', 'Thank you.']),
      )
      expect(screen.getAllByRole('radio')).toHaveLength(3)
      // The choices are English, whatever language the screen is in.
      expect(screen.getByText('Good morning.')).toHaveAttribute('lang', 'en')

      expect(button('Check')).toBeDisabled()
      expect(button('Check')).toHaveAccessibleDescription('Choose an answer to continue.')

      await userEvent.click(screen.getByRole('radio', { name: 'Goodbye.' }))
      expect(button('Check')).toBeEnabled()
      expect(screen.queryByText('Choose an answer to continue.')).toBeNull()
    })

    it('gives a right answer a tick, locks the choices, and goes on to the next question', async () => {
      renderDay(quiz)
      await step()

      await answer('Good morning.')

      expect(screen.getByText('That is right. Well done!')).toBeVisible()
      expect(screen.queryByText('Not quite. The answer is:')).toBeNull()
      for (const choice of screen.getAllByRole('radio')) expect(choice).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Check' })).toBeNull()

      await userEvent.click(next())
      expect(screen.getByText('Question 2 of 5')).toBeVisible()
      expect(question()).toHaveTextContent('Someone asks, “How are you?” What do you say?')
      // The new question is announced by moving focus to it, and nothing is chosen yet.
      expect(question()).toHaveFocus()
      expect(screen.queryByText('That is right. Well done!')).toBeNull()
      for (const choice of screen.getAllByRole('radio')) expect(choice).not.toBeChecked()
    })

    it('shows the answer to a wrong one, and says it aloud on request', async () => {
      renderDay(quiz)
      await step()

      await answer('Thank you.')

      const feedback = screen.getByText('Not quite. The answer is:').parentElement as HTMLElement
      expect(within(feedback).getByText('Good morning.')).toHaveAttribute('lang', 'en')
      expect(screen.queryByText('That is right. Well done!')).toBeNull()

      await userEvent.click(button('Listen to the answer'))
      expect(vi.mocked(speak).mock.lastCall?.[0]).toBe('Good morning.')
    })

    it('asks a missed question once more at the end, then counts what was right first time', async () => {
      const router = renderDay(quiz)
      await step()

      await answer('Good morning.')
      await userEvent.click(next())
      await answer('Nice to meet you.')
      await userEvent.click(next())
      await answer('What’s your name?')
      await userEvent.click(next())
      await answer('Nice to meet you.')
      await userEvent.click(next())
      await answer('Goodbye! Have a nice day.')
      await userEvent.click(next())

      // The second question was missed, so it comes back — and is not numbered again.
      expect(screen.getByText('One more try')).toBeVisible()
      expect(screen.queryByText(/^Question \d/)).toBeNull()
      expect(question()).toHaveTextContent('Someone asks, “How are you?” What do you say?')
      await answer('My name is Asha.')
      await userEvent.click(next())

      // Missed twice, it is still not asked a third time.
      const done = await screen.findByRole('heading', { level: 1, name: 'Quiz finished' })
      expect(done).toHaveFocus()
      expect(screen.getByText('Right the first time: 4 of 5')).toBeVisible()
      expect(progress().reviewParts).toEqual({})

      await userEvent.click(next())
      expect(await list()).toBeVisible()
      expect(router.state.location.search).toBe('')
      expect(progress().reviewParts).toEqual({ 1: ['quiz'] })
      // A part of the review done is not the day done.
      expect(progress().doneDays).toEqual({})
      expect(link('Quick quiz Vocabulary and expressions Done')).toBeVisible()
    })

    it('starts over on "Try the quiz again"', async () => {
      settingsRepository.write(WEEK_QUIZZES_CONFIG_NAME, {
        1: {
          questions: [
            {
              question: { text: 'How do you say thanks?' },
              answer: 'Thank you.',
              others: ['Hello.'],
            },
          ],
        },
      })
      renderDay(quiz)
      await step()
      expect(screen.getByText('Question 1 of 1')).toBeVisible()

      await answer('Thank you.')
      await userEvent.click(next())
      expect(screen.getByText('Right the first time: 1 of 1')).toBeVisible()

      await userEvent.click(button('Try the quiz again'))
      expect(question()).toHaveTextContent('How do you say thanks?')
      expect(button('Check')).toBeDisabled()
    })

    it('asks a Bengali learner in Bengali, with the choices still in English', async () => {
      useLanguageStore.setState({ language: 'bn' })
      renderDay(quiz)
      await screen.findByRole('heading', { level: 1, name: 'ছোট কুইজ' })

      expect(screen.getByText('৫টি প্রশ্নের মধ্যে প্রশ্ন ১')).toBeVisible()
      expect(question()).toHaveTextContent('এখন সকাল। কাউকে কীভাবে শুভেচ্ছা জানাবেন?')
      expect(question()).toHaveAttribute('lang', 'bn')
      expect(screen.getByText('Good morning.')).toHaveAttribute('lang', 'en')
    })

    it('asks in English, marked as English, where a question is not written in the learner’s language', async () => {
      settingsRepository.write(WEEK_QUIZZES_CONFIG_NAME, {
        1: {
          questions: [
            {
              question: { text: 'How do you say thanks?' },
              answer: 'Thank you.',
              others: ['Hello.'],
            },
          ],
        },
      })
      useLanguageStore.setState({ language: 'bn' })
      renderDay(quiz)
      await screen.findByRole('heading', { level: 1, name: 'ছোট কুইজ' })

      expect(question()).toHaveTextContent('How do you say thanks?')
      expect(question()).toHaveAttribute('lang', 'en')
    })

    it('offers no speaker for the answer on a device with no speech at all', async () => {
      vi.mocked(isSpeechSupported).mockReturnValue(false)
      renderDay(quiz)
      await step()

      await answer('Thank you.')
      expect(screen.getByText('Not quite. The answer is:')).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Listen to the answer' })).toBeNull()
    })
  })

  describe('listening practice', () => {
    const listening = `${day6}?part=listening`
    const step = () => screen.findByRole('heading', { level: 1, name: 'Listening practice' })

    it('is Day 1’s screen with another conversation, and leads back to the review', async () => {
      renderDay(listening)
      await step()

      expect(screen.getByText('Listen to a new conversation.')).toBeVisible()
      expect(screen.getByText('6/7')).toBeVisible()
      expect(link('Back to the review')).toHaveAttribute('href', day6)
      const lines = within(screen.getByRole('list', { name: 'Conversation' })).getAllByRole(
        'listitem',
      )
      expect(lines).toHaveLength(9)
      expect(lines[0]).toHaveTextContent('MeeraHi! Good afternoon.')
      expect(next()).toBeDisabled()
    })

    it('opens Next after one full listen, and ticks the part without touching Day 1', async () => {
      renderDay(listening)
      await step()

      await userEvent.click(button('Play the conversation'))
      expect(vi.mocked(speakAll).mock.lastCall?.[0]?.[0]).toMatchObject({
        text: 'Hi! Good afternoon.',
      })
      await userEvent.click(next())

      expect(await list()).toBeVisible()
      expect(progress().reviewParts).toEqual({ 1: ['listening'] })
      expect(progress().heardWeeks).toEqual([])
      expect(progress().doneDays).toEqual({})
    })

    it('leaves Next open for a learner who has done the part before', async () => {
      useLessonProgressStore.setState({ reviewParts: { 1: ['listening'] } })
      renderDay(listening)
      await step()
      expect(next()).toBeEnabled()
    })
  })

  describe('speaking practice', () => {
    const speaking = `${day6}?part=speaking`

    it('repeats the week’s challenge, and never forces the microphone', async () => {
      renderDay(speaking)
      await screen.findByRole('heading', { level: 1, name: 'First meeting challenge' })

      expect(link('Back to the review')).toHaveAttribute('href', day6)
      expect(
        within(screen.getByRole('list', { name: 'What to do' })).getAllByRole('listitem'),
      ).toHaveLength(5)
      expect(next()).toBeDisabled()

      await userEvent.click(button('I can’t record right now'))
      await userEvent.click(next())

      expect(await list()).toBeVisible()
      expect(progress().reviewParts).toEqual({ 1: ['speaking'] })
      // Day 5 itself is not finished by practising it again here.
      expect(progress().doneDays).toEqual({})
    })
  })

  describe('vocabulary flashcards', () => {
    const cards = `${day6}?part=flashcards`
    const bengali = async () => {
      useLanguageStore.setState({ language: 'bn' })
      const router = renderDay(cards)
      await screen.findByRole('heading', { level: 1, name: 'শব্দের ফ্ল্যাশকার্ড' })
      return router
    }
    const show = () => userEvent.click(button('শব্দটি দেখুন'))
    const known = () => userEvent.click(button('এটি আমি জানি'))

    it('starts from the meaning, and shows and says the word when the card is turned', async () => {
      await bengali()

      expect(screen.getByText('বাকি কার্ড: ৬')).toBeVisible()
      expect(screen.getByText('শব্দটি ইংরেজিতে বলুন, তারপর কার্ডটি উল্টান।')).toBeVisible()
      expect(screen.getByText('হ্যালো')).toHaveAttribute('lang', 'bn')
      expect(screen.queryByText('hello')).toBeNull()
      expect(screen.queryByRole('button', { name: 'এটি আমি জানি' })).toBeNull()
      expect(speak).not.toHaveBeenCalled()

      await show()

      expect(screen.getByText('hello')).toHaveAttribute('lang', 'en')
      expect(screen.getByText('হ্যালো')).toBeVisible()
      expect(vi.mocked(speak).mock.lastCall?.[0]).toBe('hello')
      expect(screen.queryByRole('button', { name: 'শব্দটি দেখুন' })).toBeNull()

      vi.mocked(speak).mockClear()
      await userEvent.click(button('শব্দটি শুনুন: hello'))
      expect(vi.mocked(speak).mock.lastCall?.[0]).toBe('hello')
    })

    it('sends a card to the back of the pile on "Practise again", and puts it away on "I know it"', async () => {
      const router = await bengali()

      await show()
      await userEvent.click(button('আবার অনুশীলন করব'))
      // Still six to go, and the next word is on top, face down.
      expect(screen.getByText('বাকি কার্ড: ৬')).toBeVisible()
      expect(screen.getByText('সুপ্রভাত')).toBeVisible()
      expect(screen.queryByText('good morning')).toBeNull()

      for (const left of ['৫', '৪', '৩', '২', '১']) {
        await show()
        await known()
        expect(screen.getByText(`বাকি কার্ড: ${left}`)).toBeVisible()
      }

      // The card sent back is the last one.
      expect(screen.getByText('হ্যালো')).toBeVisible()
      await show()
      await known()

      expect(await screen.findByRole('heading', { level: 1, name: 'সব কার্ড শেষ' })).toHaveFocus()
      await userEvent.click(button('পরবর্তী'))

      await screen.findByRole('heading', { level: 1, name: 'সাপ্তাহিক রিভিশন' })
      expect(router.state.location.search).toBe('')
      expect(progress().reviewParts).toEqual({ 1: ['flashcards'] })
    })

    it('goes through the pile again on request', async () => {
      settingsRepository.write(WEEK_VOCABULARY_CONFIG_NAME, {
        1: { words: [{ word: 'coffee', meanings: { bn: 'কফি' } }] },
      })
      await bengali()
      await show()
      await known()
      await screen.findByRole('heading', { level: 1, name: 'সব কার্ড শেষ' })

      await userEvent.click(button('আবার সবগুলো দেখুন'))
      expect(screen.getByText('বাকি কার্ড: ১')).toBeVisible()
      expect(screen.getByText('কফি')).toBeVisible()
      expect(screen.queryByText('coffee')).toBeNull()
    })

    it('gives a learner with no meaning to start from the word itself, to hear and say', async () => {
      renderDay(cards)
      await screen.findByRole('heading', { level: 1, name: 'Vocabulary flashcards' })

      expect(screen.getByText('Cards left: 6')).toBeVisible()
      expect(screen.getByText('Listen to each word and say it.')).toBeVisible()
      expect(screen.getByText('hello')).toBeVisible()
      expect(screen.queryByText('How do you say this in English?')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Show the word' })).toBeNull()
      expect(button('I know it')).toBeVisible()

      await userEvent.click(button('Listen to the word: hello'))
      expect(vi.mocked(speak).mock.lastCall?.[0]).toBe('hello')
    })

    it('says so when the device fails to say a word', async () => {
      vi.mocked(speak).mockRejectedValue(new Error('no voice'))
      renderDay(cards)
      await screen.findByRole('heading', { level: 1, name: 'Vocabulary flashcards' })

      await userEvent.click(button('Listen to the word: hello'))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'The words cannot be played right now. Read them, then continue.',
      )
    })

    it('offers no speaker on a device with no speech at all', async () => {
      vi.mocked(isSpeechSupported).mockReturnValue(false)
      renderDay(cards)
      await screen.findByRole('heading', { level: 1, name: 'Vocabulary flashcards' })
      expect(screen.queryByRole('button', { name: /^Listen to the word/ })).toBeNull()
    })
  })

  describe('the mini role-play', () => {
    const roleplay = `${day6}?part=roleplay`
    const step = () => screen.findByRole('heading', { level: 1, name: 'Talk to Meera' })

    it('is Day 4’s screen with another partner, and ticks the part at its end', async () => {
      renderDay(roleplay)
      await step()
      expect(link('Back to the review')).toHaveAttribute('href', day6)

      await userEvent.click(button('Start the conversation'))
      expect(vi.mocked(speak).mock.lastCall?.[0]).toBe('Hi! Good afternoon.')
      for (let turn = 0; turn < 4; turn += 1) await userEvent.click(button('Skip this turn'))
      await userEvent.click(next())

      expect(await list()).toBeVisible()
      expect(progress().reviewParts).toEqual({ 1: ['roleplay'] })
      expect(progress().doneDays).toEqual({})
    })

    it('says on "End chat" that it can be started again from the review, and leads there', async () => {
      renderDay(roleplay)
      await step()
      await userEvent.click(button('Start the conversation'))

      await userEvent.click(button('End chat'))

      expect(screen.getByText('You can start again from the review.')).toBeVisible()
      expect(screen.queryByText(/The day will not be finished/)).toBeNull()
      await userEvent.click(link('End chat'))
      expect(await list()).toBeVisible()
      expect(progress().reviewParts).toEqual({})
    })
  })

  describe('with what an admin set', () => {
    const written = {
      questions: [
        { question: { text: 'How do you order?' }, answer: 'A coffee, please.', others: ['Bye.'] },
      ],
    }

    it('opens the day for a week once any part has something, listing only those parts', async () => {
      renderDay('/lessons/weeks/2/days/6')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 6' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_QUIZZES_CONFIG_NAME, { 2: written }))
      await list()
      expect(activities().map((activity) => activity.textContent)).toEqual([
        'Quick quiz Vocabulary and expressions',
      ])

      // The week's words (Day 2) are the review's flashcards too.
      act(() =>
        settingsRepository.write(WEEK_VOCABULARY_CONFIG_NAME, {
          2: { words: [{ word: 'coffee' }, { word: 'tea' }] },
        }),
      )
      expect(activities().map((activity) => activity.textContent)).toEqual([
        'Quick quiz Vocabulary and expressions',
        'Vocabulary flashcards Key words: 2',
      ])
    })

    it('plays their conversation in place of the built-in one, leaving Day 1’s alone', async () => {
      settingsRepository.write(WEEK_REVIEW_DIALOGUES_CONFIG_NAME, {
        1: { lines: [{ speaker: 'Barista', text: 'What would you like?' }] },
      })
      renderDay(`${day6}?part=listening`)
      await screen.findByRole('heading', { level: 1, name: 'Listening practice' })

      expect(screen.getByText('What would you like?')).toBeVisible()
      expect(screen.queryByText('Hi! Good afternoon.')).toBeNull()
      // Day 1's conversation is another settings object.
      expect(settingsRepository.readRaw(WEEK_DIALOGUES_CONFIG_NAME)).toBeNull()
    })

    it('names their partner on the list', async () => {
      settingsRepository.write(WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME, {
        1: { partner: 'the barista', turns: [{ partner: 'Hello!', reply: 'Hi!' }] },
      })
      renderDay(day6)
      await list()
      expect(link('Mini role-play Talk to the barista')).toHaveAttribute(
        'href',
        `${day6}?part=roleplay`,
      )
    })
  })
})

describe('Day 7: the real-world challenge', () => {
  // Priya and Anita were written as women: with a woman as the learner's tutor, who plays
  // them, they keep those names.
  beforeEach(() => useTutorAvatarStore.setState({ avatar: 'female' }))

  const day7 = '/lessons/weeks/1/days/7'
  const picker = () => screen.findByRole('heading', { level: 1, name: 'Real-world challenge' })
  const button = (name: string | RegExp) => screen.getByRole('button', { name })
  const link = (name: string | RegExp) => screen.getByRole('link', { name })
  const choice = (name: string | RegExp) => screen.getByRole('radio', { name })
  const choices = (group: string) =>
    within(screen.getByRole('group', { name: group }))
      .getAllByRole('radio')
      .map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)
  const said = () =>
    within(screen.getByRole('list', { name: 'Conversation' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  /** Open a challenge by its address and start the conversation. */
  const start = async (search: string, partner = 'Priya') => {
    const router = renderDay(`${day7}${search}`)
    await screen.findByRole('heading', { level: 1, name: `Talk to ${partner}` })
    await userEvent.click(button('Start the conversation'))
    return router
  }

  describe('choosing', () => {
    it('offers the week’s scenarios and three levels, with the usual ones chosen', async () => {
      renderDay(day7)
      await picker()

      expect(screen.getByText('Optional day')).toBeVisible()
      expect(screen.getByText('Try a new situation.')).toBeVisible()
      expect(screen.getByText('7/7')).toBeVisible()
      expect(link('Back to the week')).toHaveAttribute('href', '/home/weeks/1')

      expect(choices('Change the scenario')).toEqual([
        'A new neighbour',
        'First day at work',
        'A phone call',
      ])
      expect(choice('A new neighbour')).toBeChecked()
      expect(choices('Challenge level')).toEqual([
        'Easier with hints',
        'Standard hints if you ask',
        'Harder no hints',
      ])
      expect(choice('Standard hints if you ask')).toBeChecked()

      expect(link('Start challenge')).toHaveAttribute('href', `${day7}?scenario=1&level=standard`)
      // Nothing is done yet, so there is no "Next" — and nothing has spoken or listened.
      expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
      expect(speak).not.toHaveBeenCalled()
      expect(startRecording).not.toHaveBeenCalled()
    })

    it('starts the scenario and the level that were chosen', async () => {
      const router = renderDay(day7)
      await picker()

      await userEvent.click(choice('A phone call'))
      await userEvent.click(choice('Harder no hints'))
      expect(link('Start challenge')).toHaveAttribute('href', `${day7}?scenario=3&level=harder`)

      await userEvent.click(link('Start challenge'))
      expect(await screen.findByRole('heading', { level: 1, name: 'Talk to Anita' })).toBeVisible()
      expect(screen.getByText('A phone call · Harder')).toBeVisible()
      expect(router.state.location.search).toBe('?scenario=3&level=harder')
      expect(link('Back to the scenarios')).toHaveAttribute('href', day7)
    })

    it('can be skipped: the day is finished and the week moves on', async () => {
      const router = renderDay(day7)
      await picker()

      await userEvent.click(button('Skip this day'))

      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({ 1: [7] })
      expect(progress().scenariosDone).toEqual({})
    })

    it('ticks a scenario taken before, chooses the next one, and offers Next', async () => {
      useLessonProgressStore.setState({ scenariosDone: { 1: [0] } })
      const router = renderDay(day7)
      await picker()

      expect(choice('A new neighbour Done')).not.toBeChecked()
      expect(choice('First day at work')).toBeChecked()
      expect(link('Start challenge')).toHaveAttribute('href', `${day7}?scenario=2&level=standard`)
      expect(screen.queryByRole('button', { name: 'Skip this day' })).toBeNull()

      await userEvent.click(next())
      expect(await screen.findByRole('heading', { name: 'The week' })).toBeVisible()
      expect(router.state.location.pathname).toBe('/home/weeks/1')
      expect(progress().doneDays).toEqual({ 1: [7] })
    })

    it.each(['?scenario=9&level=standard', '?scenario=x', '?scenario=0', '?level=harder'])(
      'shows the choices for %s, which is no scenario of the week',
      async (search) => {
        renderDay(`${day7}${search}`)
        expect(await picker()).toBeVisible()
      },
    )

    it('names the scenarios and the levels in Bengali for a Bengali learner', async () => {
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day7)
      await screen.findByRole('heading', { level: 1, name: 'বাস্তব জীবনের চ্যালেঞ্জ' })

      expect(choices('পরিস্থিতি বদলান')).toEqual(['নতুন প্রতিবেশী', 'কাজের প্রথম দিন', 'ফোনে কথা'])
      expect(screen.getByText('নতুন প্রতিবেশী')).toHaveAttribute('lang', 'bn')
      expect(choice('সাধারণ চাইলে ইঙ্গিত')).toBeChecked()
    })
  })

  describe('the Standard level', () => {
    it('is Day 4’s conversation: no help until it is asked for', async () => {
      await start('?scenario=1&level=standard')

      expect(screen.getByText('A new neighbour · Standard')).toBeVisible()
      expect(speak).toHaveBeenLastCalledWith('Hello! Good evening.', { rate: 1 })
      expect(said()).toEqual(['PriyaHello! Good evening.'])

      await userEvent.click(button('Hint'))
      expect(said()).toEqual(['PriyaHello! Good evening.', 'What to sayGood evening!'])
    })

    it('is what a level that does not exist falls back to', async () => {
      await start('?scenario=2&level=impossible', 'Sam')
      expect(screen.getByText('First day at work · Standard')).toBeVisible()
      expect(button('Hint')).toBeEnabled()
    })
  })

  describe('the Easier level', () => {
    it('tells a Bengali learner what to say on every turn, with the English one tap away', async () => {
      useLanguageStore.setState({ language: 'bn' })
      renderDay(`${day7}?scenario=1&level=easier`)
      await screen.findByRole('heading', { level: 1, name: 'Priya-এর সঙ্গে কথা বলুন' })
      expect(screen.getByText('নতুন প্রতিবেশী · সহজ')).toBeVisible()
      await userEvent.click(button('কথোপকথন শুরু করুন'))

      // Without asking: the cue is there, the English is not.
      expect(screen.getByText('তাঁকে শুভ সন্ধ্যা জানান।')).toHaveAttribute('lang', 'bn')
      expect(screen.queryByText('Good evening!')).toBeNull()

      await userEvent.click(button('আরও সাহায্য'))
      expect(screen.getByText('Good evening!')).toHaveAttribute('lang', 'en')
      expect(button('ইঙ্গিত')).toBeDisabled()

      // The next turn starts with its own cue, and the English put away again.
      await userEvent.click(button('এই পালা বাদ দিন'))
      expect(screen.getByText('নিজের নাম বলুন।')).toBeVisible()
      expect(button('আরও সাহায্য')).toBeEnabled()
      expect(screen.queryByText('যা বলবেন')).not.toBeNull()
    })

    it('shows a learner with no other language the English reply itself', async () => {
      await start('?scenario=1&level=easier')

      expect(screen.getByText('A new neighbour · Easier')).toBeVisible()
      expect(said()).toEqual(['PriyaHello! Good evening.', 'What to sayGood evening!'])
      expect(button('Hint')).toBeDisabled()
    })
  })

  describe('the Harder level', () => {
    it('has no hint to ask for; a reply is shown only once the turn is over', async () => {
      await start('?scenario=1&level=harder')

      expect(screen.getByText('A new neighbour · Harder')).toBeVisible()
      expect(screen.queryByRole('button', { name: /Hint|More help/ })).toBeNull()
      expect(screen.queryByText('Good evening!')).toBeNull()
      // Speaking is still never a condition.
      await userEvent.click(button('Skip this turn'))
      expect(said().slice(0, 2)).toEqual([
        'PriyaHello! Good evening.',
        'You could sayGood evening!',
      ])
      expect(screen.queryByText('What to say')).toBeNull()
    })
  })

  it('ticks the scenario at the end of its conversation, and keeps the level that was chosen', async () => {
    const router = renderDay(day7)
    await picker()
    await userEvent.click(choice('Easier with hints'))
    await userEvent.click(link('Start challenge'))
    await screen.findByRole('heading', { level: 1, name: 'Talk to Priya' })
    await userEvent.click(button('Start the conversation'))

    for (const turn of [1, 2, 3, 4]) {
      expect(screen.queryByRole('button', { name: 'Next' }), `before turn ${turn}`).toBeNull()
      await userEvent.click(button('Skip this turn'))
    }
    expect(await screen.findByText('Well done! You finished the conversation.')).toBeVisible()
    expect(progress().scenariosDone).toEqual({})
    await userEvent.click(next())

    expect(await picker()).toBeVisible()
    expect(router.state.location.search).toBe('')
    expect(progress().scenariosDone).toEqual({ 1: [0] })
    // A scenario done is not the day done.
    expect(progress().doneDays).toEqual({})
    expect(choice('A new neighbour Done')).toBeInTheDocument()
    expect(choice('First day at work')).toBeChecked()
    expect(choice('Easier with hints')).toBeChecked()
    expect(link('Start challenge')).toHaveAttribute('href', `${day7}?scenario=2&level=easier`)
    expect(next()).toBeEnabled()
  })

  it('says on "End chat" that it can be started again from the scenarios, and leads there', async () => {
    await start('?scenario=1&level=standard')

    await userEvent.click(button('End chat'))
    expect(screen.getByText('You can start again from the list of scenarios.')).toBeVisible()

    await userEvent.click(link('End chat'))
    expect(await picker()).toBeVisible()
    expect(progress().scenariosDone).toEqual({})
  })

  describe('with what an admin set', () => {
    const written = {
      scenarios: [
        {
          name: { text: 'Takeaway café', translations: { bn: 'টেকঅ্যাওয়ে ক্যাফে' } },
          roleplay: {
            partner: 'the barista',
            turns: [{ partner: 'What would you like?', reply: 'A coffee, please.' }],
          },
        },
        {
          name: { text: 'Bakery' },
          roleplay: { partner: 'the baker', turns: [{ partner: 'Hello!', reply: 'Hi!' }] },
        },
      ],
    }

    it('opens the day for a week once it has scenarios, over the week’s own picture', async () => {
      settingsRepository.write(WEEK_PICTURES_CONFIG_NAME, { 2: '/weeks/cafe.webp' })
      renderDay('/lessons/weeks/2/days/7')
      expect(await screen.findByRole('heading', { level: 1, name: 'Week 2 · Day 7' })).toBeVisible()

      act(() => settingsRepository.write(WEEK_SCENARIOS_CONFIG_NAME, { 2: written }))
      await picker()
      expect(choices('Change the scenario')).toEqual(['Takeaway café', 'Bakery'])
      expect(document.querySelector('main img')).toHaveAttribute('src', '/weeks/cafe.webp')

      await userEvent.click(choice('Bakery'))
      await userEvent.click(link('Start challenge'))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Talk to the baker' }),
      ).toBeVisible()
    })

    it('names a scenario in English, marked as English, where it is not written in the learner’s language', async () => {
      settingsRepository.write(WEEK_SCENARIOS_CONFIG_NAME, { 1: written })
      useLanguageStore.setState({ language: 'bn' })
      renderDay(day7)
      await screen.findByRole('heading', { level: 1, name: 'বাস্তব জীবনের চ্যালেঞ্জ' })

      expect(screen.getByText('টেকঅ্যাওয়ে ক্যাফে')).toHaveAttribute('lang', 'bn')
      expect(screen.getByText('Bakery')).toHaveAttribute('lang', 'en')
    })
  })
})

describe('a day with nothing in it yet', () => {
  it.each([
    ['/lessons/weeks/2/days/1', 'Week 2 · Day 1', '/home/weeks/2'],
    ['/lessons/weeks/2/days/2', 'Week 2 · Day 2', '/home/weeks/2'],
    ['/lessons/weeks/2/days/3', 'Week 2 · Day 3', '/home/weeks/2'],
    ['/lessons/weeks/2/days/4', 'Week 2 · Day 4', '/home/weeks/2'],
    ['/lessons/weeks/2/days/5', 'Week 2 · Day 5', '/home/weeks/2'],
    ['/lessons/weeks/2/days/6', 'Week 2 · Day 6', '/home/weeks/2'],
    ['/lessons/weeks/2/days/7', 'Week 2 · Day 7', '/home/weeks/2'],
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
