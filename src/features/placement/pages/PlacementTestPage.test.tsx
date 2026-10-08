import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MicrophoneError, requestMicrophone } from '@/shared/lib/audio/microphone'
import type * as Microphone from '@/shared/lib/audio/microphone'
import { startRecording } from '@/shared/lib/audio/recorder'
import { isSpeechSupported, speak } from '@/shared/lib/audio/speech'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { findItem } from '../data/itemBank'
import { placementRoutes } from '../index'
import { usePlacementStore } from '../store/usePlacementStore'
import { LEVELS, type Level } from '../types'

// jsdom has no speech synthesis, microphone or audio playback; their own tests cover them.
vi.mock('@/shared/lib/audio/speech', () => ({
  isSpeechSupported: vi.fn(() => true),
  primeVoices: vi.fn(),
  cancelSpeech: vi.fn(),
  speak: vi.fn(async () => 'ended'),
}))
vi.mock('@/shared/lib/audio/microphone', async (importOriginal) => ({
  ...(await importOriginal<typeof Microphone>()),
  requestMicrophone: vi.fn(async () => ({ getTracks: () => [] })),
}))
vi.mock('@/shared/lib/audio/recorder', () => ({
  startRecording: vi.fn(async () => {
    let end: (recording: unknown) => void = () => {}
    const finished = new Promise((resolve) => (end = resolve))
    return {
      stop: () => end({ blob: new Blob(['voice']), durationMs: 1800, mimeType: 'audio/webm' }),
      finished,
    }
  }),
}))

const session = () => {
  const current = usePlacementStore.getState().session
  if (!current) throw new Error('no session')
  return current
}
const currentItem = () => findItem(session().currentItemId)

function renderTest(initialPath: string = paths.placementTest) {
  const router = createMemoryRouter(
    [
      ...placementRoutes,
      { path: paths.home, element: <h1>Home</h1> },
      { path: paths.onboardingPlacement, element: <h1>Placement intro</h1> },
    ],
    { initialEntries: [initialPath] },
  )
  render(
    <AppLanguageProvider>
      <RouterProvider router={router} />
    </AppLanguageProvider>,
  )
  return router
}

const tap = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }))
const heading = (name: string) => screen.findByRole('heading', { level: 1, name })

/** Answer choice questions until the stage is over, as a learner of this ability would. */
async function answerStage(ability: Level) {
  const stage = session().stage
  while (session().stage === stage && session().stageStarted) {
    const item = currentItem()
    if (!item || item.stage === 'SPEAK') throw new Error('expected a choice question')
    if (item.stage === 'LISTEN') await tap('Play')

    const knows = LEVELS.indexOf(item.level) <= LEVELS.indexOf(ability)
    const option = item.options[knows ? item.answer : (item.answer + 1) % item.options.length]
    await userEvent.click(await screen.findByRole('radio', { name: option }))
    await tap('Continue')
  }
}

async function recordAnAnswer() {
  await tap('Tap to speak')
  expect(await screen.findByRole('status')).toHaveTextContent('Recording…')
  await tap('Stop recording')
  expect(await screen.findByRole('status')).toHaveTextContent('Got it!')
}

/** A test with Listen and Understand already answered, standing at the speaking introduction. */
function seedAtSpeaking() {
  const store = usePlacementStore.getState()
  store.start('en')
  for (let stages = 0; stages < 2; stages++) {
    usePlacementStore.getState().beginStage()
    const stage = session().stage
    while (session().stage === stage && session().currentItemId) {
      const item = currentItem()
      if (!item || item.stage === 'SPEAK') break
      usePlacementStore.getState().submitAnswer({ answer: item.answer })
    }
  }
}

beforeAll(async () => {
  // The routes are lazy; load their chunks up front so no test waits on the transform.
  await Promise.all([import('./PlacementTestPage'), import('./PlacementResultPage')])
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: () => 'blob:take', revokeObjectURL: () => {} }),
  )
  window.HTMLMediaElement.prototype.play = vi.fn(async () => {})
  window.HTMLMediaElement.prototype.pause = vi.fn()
})

beforeEach(() => {
  localStorage.clear()
  usePlacementStore.setState({ session: null, result: null, events: [] })
  useLanguageStore.setState({ language: null })
})

afterEach(() => vi.clearAllMocks())

describe('a full run', () => {
  it('goes from the first introduction to a starting point', async () => {
    const router = renderTest()

    await heading('First, let’s listen')
    expect(session()).toMatchObject({ status: 'IN_PROGRESS', stage: 'LISTEN' })
    await tap('Continue')

    await heading('Listen and choose the answer')
    // Nothing to read or choose from until the sentence has been heard.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await answerStage('A2')

    await heading('Now, a few questions')
    await tap('Continue')
    await heading('Choose the best answer')
    await answerStage('A2')

    await heading('Last part: let’s hear you speak')
    expect(requestMicrophone).not.toHaveBeenCalled()
    await tap('Allow microphone')

    for (const prompt of ['Tell me your name.', 'Where are you from?']) {
      await heading('Say it out loud')
      expect(await screen.findByText(prompt)).toBeVisible()
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
      await recordAnAnswer()
      await tap('Continue')
    }
    expect(await screen.findByText('Tell me something about yourself.')).toBeVisible()
    await recordAnAnswer()
    await tap('Listen')
    await tap('Continue')

    await heading('We’ve found your starting point!')
    expect(router.state.location.pathname).toBe(paths.placementResult)
    expect(screen.getByText('You’re ready to begin at Level A2.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Start My Learning Journey' })).toHaveAttribute(
      'href',
      paths.home,
    )

    // Details name a level for what was measured and say plainly what was not.
    await userEvent.click(screen.getByText('See My Results'))
    const speaking = screen.getByText('Speaking').closest('div')
    if (!speaking) throw new Error('no speaking row')
    expect(within(speaking).getByText('Not scored yet')).toBeVisible()
    // No percentage, no verdict.
    expect(screen.queryByText(/%|fail|poor|wrong/i)).not.toBeInTheDocument()

    const { result } = usePlacementStore.getState()
    expect(result?.recommendation).toMatchObject({ startLevel: 'A2', provisional: true })
    expect(result?.profile.speakingAttempts).toBe(3)
    // Only facts about the recordings are kept, never the recordings.
    expect(localStorage.getItem('kuhedu-placement')).not.toMatch(/blob|voice/)
  })
})

describe('a question', () => {
  it('counts replays and slow replays without treating them as mistakes', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    const item = currentItem()
    if (item?.stage !== 'LISTEN') throw new Error('expected a listening question')

    await tap('Play')
    expect(speak).toHaveBeenLastCalledWith(item.audioText, { rate: 1 })
    await tap('Play again')
    await tap('Play slowly')
    expect(speak).toHaveBeenLastCalledWith(item.audioText, { rate: 0.75 })

    await userEvent.click(screen.getByRole('radio', { name: item.options[item.answer] }))
    await tap('Continue')

    expect(session().responses[0]).toMatchObject({
      playCount: 2,
      slowPlayCount: 1,
      correct: true,
      helpOpened: false,
    })
  })

  it('opens on Play alone, stays that way while playing, then shows the question and answers', async () => {
    let finishSpeaking: (outcome: 'ended') => void = () => {}
    vi.mocked(speak).mockImplementationOnce(
      () => new Promise((resolve) => (finishSpeaking = resolve)),
    )
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    const item = currentItem()
    if (item?.stage !== 'LISTEN') throw new Error('expected a listening question')

    await heading('Listen and choose the answer')
    expect(screen.getByRole('button', { name: 'Play' })).toBeVisible()
    expect(screen.queryByText(item.question)).not.toBeInTheDocument()

    // While the sentence plays nothing else comes on screen.
    await tap('Play')
    expect(screen.getByRole('button', { name: 'Playing…' })).toBeDisabled()
    expect(screen.queryByText(item.question)).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play slowly' })).not.toBeInTheDocument()

    // Heard through: the question screen, with the replay controls.
    finishSpeaking('ended')
    expect(await screen.findAllByRole('radio')).toHaveLength(item.options.length)
    expect(screen.getByText(item.question)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Play again' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Play slowly' })).toBeVisible()
  })

  it('brings in the question for a learner who asks for help before playing', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    const item = currentItem()
    if (item?.stage !== 'LISTEN') throw new Error('expected a listening question')
    await heading('Listen and choose the answer')

    await tap('I’m not sure')

    expect(screen.getByText(item.question)).toBeVisible()
    expect(screen.getByRole('region', { name: 'Need help?' })).toBeVisible()
    // Still nothing to choose from before listening.
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(speak).not.toHaveBeenCalled()
  })

  it('offers the text and a skip to a learner who is not sure, and records the help used', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    const item = currentItem()
    if (item?.stage !== 'LISTEN') throw new Error('expected a listening question')
    await tap('Play')

    await tap('I’m not sure')
    const help = screen.getByRole('region', { name: 'Need help?' })
    // English-only learners have no other language to see it in.
    expect(within(help).queryByRole('button', { name: /See it in/ })).not.toBeInTheDocument()
    await userEvent.click(within(help).getByRole('button', { name: 'Show the text' }))
    expect(within(help).getByText(item.audioText)).toBeVisible()

    await userEvent.click(within(help).getByRole('button', { name: 'Skip this question' }))

    expect(session().responses[0]).toMatchObject({
      skipped: 'notSure',
      correct: false,
      helpOpened: true,
      transcriptShown: true,
      translationOffered: false,
    })
    expect(currentItem()?.id).not.toBe(item.id)
  })

  it('shows the question in the learner’s language when they ask for it', async () => {
    useLanguageStore.setState({ language: 'bn' })
    renderTest()
    await heading('প্রথমে, চলুন শুনি')
    await tap('এগিয়ে যান')
    const item = currentItem()
    if (item?.stage !== 'LISTEN' || !item.translations?.bn) {
      throw new Error('expected a listening question with a Bengali help text')
    }
    await tap('চালান')

    // Not on show until the learner says they are not sure.
    expect(screen.queryByText(item.translations.bn)).not.toBeInTheDocument()
    await tap('আমি নিশ্চিত নই')
    await tap('বাংলা ভাষায় দেখুন')
    expect(screen.getByText(item.translations.bn)).toHaveAttribute('lang', 'bn')

    await userEvent.click(screen.getByRole('radio', { name: item.options[item.answer] }))
    await tap('এগিয়ে যান')

    expect(session().responses[0]).toMatchObject({
      correct: true,
      translationOffered: true,
      translationUsed: true,
    })
    expect(session().languageSupport).toBe('bn')
  })

  it('lets a learner leave a question the device cannot play, and gives up on listening after two', async () => {
    vi.mocked(speak).mockRejectedValue(new Error('no voice'))
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')

    await tap('Play')
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t play the audio.')
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeVisible()
    await tap('Skip')

    await tap('Play')
    await screen.findByRole('alert')
    await tap('Skip')

    await heading('Now, a few questions')
    expect(session().notAssessed.LISTEN).toBe('audioUnavailable')
    expect(session().responses.map((entry) => entry.correct)).toEqual([null, null])
    vi.mocked(speak).mockResolvedValue('ended')
  })

  it('skips listening outright on a device with no voice', async () => {
    vi.mocked(isSpeechSupported).mockReturnValue(false)
    renderTest()

    await heading('First, let’s listen')
    expect(screen.getByText(/can’t play the audio/)).toBeVisible()
    await tap('Continue')

    await heading('Now, a few questions')
    expect(session().notAssessed.LISTEN).toBe('audioUnavailable')
    vi.mocked(isSpeechSupported).mockReturnValue(true)
  })
})

describe('leaving and coming back', () => {
  it('offers an unfinished test back at the same question', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    await tap('Play')
    const item = currentItem()
    if (item?.stage !== 'LISTEN') throw new Error('expected a listening question')
    await userEvent.click(screen.getByRole('radio', { name: item.options[item.answer] }))
    await tap('Continue')
    const next = currentItem()
    if (next?.stage !== 'LISTEN') throw new Error('expected a listening question')

    // The app is closed, and opened again later.
    cleanup()
    renderTest()
    await heading('Welcome back!')
    expect(screen.getByText('Your placement test is waiting for you.')).toBeVisible()
    await tap('Continue Test')

    await heading('Listen and choose the answer')
    await tap('Play')
    expect(await screen.findByText(next.question)).toBeVisible()
    expect(session().responses).toHaveLength(1)
  })

  it('pauses on request, and starts again only after asking twice', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    await heading('Listen and choose the answer')
    const before = session().id

    await tap('Pause test')
    await heading('Test paused')
    expect(session().status).toBe('PAUSED')
    expect(screen.getByRole('link', { name: 'Finish later' })).toHaveAttribute('href', paths.home)

    await tap('Start Again')
    expect(screen.getByRole('alert')).toHaveTextContent('Your answers so far will be cleared.')
    await tap('Keep my answers')
    expect(session().id).toBe(before)

    await tap('Start Again')
    await tap('Yes, start again')
    await heading('First, let’s listen')
    expect(session().id).not.toBe(before)
    expect(session().status).toBe('IN_PROGRESS')
  })

  it('pauses when the app is hidden and carries on when it is shown again', async () => {
    renderTest()
    await heading('First, let’s listen')
    await tap('Continue')
    const hide = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }

    hide(true)
    expect(session().status).toBe('PAUSED')
    hide(false)
    expect(session().status).toBe('IN_PROGRESS')
    expect(await heading('Listen and choose the answer')).toBeVisible()
  })
})

describe('speaking', () => {
  it('explains the microphone first, and goes on without it when it is blocked', async () => {
    seedAtSpeaking()
    vi.mocked(requestMicrophone).mockRejectedValueOnce(new MicrophoneError('denied'))
    const router = renderTest()

    await heading('Welcome back!')
    await tap('Continue Test')
    await heading('Last part: let’s hear you speak')
    expect(screen.getByText('We need your microphone for the speaking part.')).toBeVisible()
    expect(screen.getByText('Your recording stays on this device and is not saved.')).toBeVisible()

    await tap('Allow microphone')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('The microphone is blocked for this app.')
    expect(alert).toHaveTextContent('On Android')
    expect(alert).toHaveTextContent('On iPhone')
    // The pinned action now retries; going on without speaking stays on offer.
    expect(screen.getByRole('button', { name: 'Check Microphone' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Allow microphone' })).not.toBeInTheDocument()

    await tap('Continue without speaking')

    await heading('We’ve found your starting point!')
    expect(router.state.location.pathname).toBe(paths.placementResult)
    expect(usePlacementStore.getState().result?.profile.speaking).toEqual({
      status: 'notAssessed',
      reason: 'microphoneDenied',
    })
    await userEvent.click(screen.getByText('See My Results'))
    expect(screen.getByText('Not checked this time')).toBeVisible()
  })

  it('lets a learner hear an example, try again, or say they cannot answer yet', async () => {
    seedAtSpeaking()
    renderTest()
    await heading('Welcome back!')
    await tap('Continue Test')
    await tap('Allow microphone')
    await heading('Say it out loud')

    await tap('Hear the question')
    expect(speak).toHaveBeenLastCalledWith('Tell me your name.', { rate: 1 })

    await recordAnAnswer()
    await tap('Try again')
    expect(await screen.findByRole('status')).toHaveTextContent('Recording…')
    await tap('Stop recording')
    await waitFor(() => expect(startRecording).toHaveBeenCalledTimes(2))
    expect(await screen.findByRole('status')).toHaveTextContent('Got it!')
    await tap('Continue')

    await screen.findByText('Where are you from?')
    await tap('I’m not sure')
    await tap('Hear an example')
    expect(speak).toHaveBeenLastCalledWith('I am from Kolkata.', { rate: 1 })
    await tap('I can’t answer this yet')

    // No harder prompt follows one the learner could not answer.
    await heading('We’ve found your starting point!')
    const speakingAnswers = session().responses.filter((entry) => entry.stage === 'SPEAK')
    expect(speakingAnswers).toHaveLength(2)
    expect(speakingAnswers[0]).toMatchObject({ recordingAttempts: 2, playCount: 1, skipped: null })
    expect(speakingAnswers[1]).toMatchObject({
      skipped: 'declined',
      modelPlayed: true,
      recordingAttempts: 0,
    })
  })
})

describe('the result screen', () => {
  it('sends a learner with no result to the test’s introduction', async () => {
    renderTest(paths.placementResult)
    expect(await screen.findByRole('heading', { name: 'Placement intro' })).toBeVisible()
  })

  it('lets a learner take the test again', async () => {
    seedAtSpeaking()
    usePlacementStore.getState().skipStage('learnerSkipped')
    const finished = session().id
    const router = renderTest(paths.placementTest)

    // A finished test opens on its result, not on the questions.
    await heading('We’ve found your starting point!')
    await userEvent.click(screen.getByText('See My Results'))
    await tap('Take the test again')

    await heading('First, let’s listen')
    expect(router.state.location.pathname).toBe(paths.placementTest)
    expect(session().id).not.toBe(finished)
  })
})
