import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelSpeech, hasVoiceFor, isSpeechSupported, speak } from '@/shared/lib/audio/speech'
import { I18nProvider } from '@/shared/lib/i18n'
import { TutorNarrator } from './TutorNarrator'
import { useTutorSoundStore } from './useTutorSoundStore'

// jsdom has no speech synthesis; its own tests cover it.
vi.mock('@/shared/lib/audio/speech', () => ({
  isSpeechSupported: vi.fn(),
  hasVoiceFor: vi.fn(),
  onVoicesChanged: () => () => {},
  onSpeechActivity: () => () => {},
  primeVoices: vi.fn(),
  cancelSpeech: vi.fn(),
  speak: vi.fn(),
}))

/** Whether the learner has touched the page since it was opened, as the browser reports it. */
function touched(hasBeenActive: boolean | undefined) {
  Object.defineProperty(navigator, 'userActivation', {
    value: hasBeenActive === undefined ? undefined : { hasBeenActive },
    configurable: true,
  })
}

function renderTutor(line: string, language = 'en') {
  const tutor = (text: string) => (
    <I18nProvider language={language}>
      <TutorNarrator line={text} />
    </I18nProvider>
  )
  const view = render(tutor(line))
  return { say: (text: string) => view.rerender(tutor(text)) }
}

const button = (name: string) => screen.getByRole('button', { name })

beforeEach(() => {
  localStorage.clear()
  useTutorSoundStore.setState({ muted: false })
  vi.mocked(isSpeechSupported).mockReset().mockReturnValue(true)
  vi.mocked(hasVoiceFor).mockReset().mockReturnValue(false)
  vi.mocked(cancelSpeech).mockReset()
  // A line that goes on being said until it is stopped.
  vi.mocked(speak)
    .mockReset()
    .mockImplementation(() => new Promise(() => {}))
  touched(true)
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'userActivation')
})

describe('TutorNarrator', () => {
  it('says its line when the screen opens, and writes it out', () => {
    renderTutor('You are in Section 1.')

    expect(screen.getByRole('region', { name: 'Your tutor' })).toHaveTextContent(
      'You are in Section 1.',
    )
    expect(speak).toHaveBeenCalledOnce()
    expect(speak).toHaveBeenCalledWith('You are in Section 1.', { rate: 1 })
    // While it speaks, the face stops it.
    expect(button('Stop the tutor')).toBeVisible()
  })

  it('says the new line when what matters on the screen changes', () => {
    const { say } = renderTutor('Day 1 is next.')
    say('Day 2 is next.')

    expect(speak).toHaveBeenCalledTimes(2)
    expect(speak).toHaveBeenLastCalledWith('Day 2 is next.', { rate: 1 })
    // The line it was on is cut short, not talked over.
    expect(cancelSpeech).toHaveBeenCalled()
  })

  it('does not say the same line again when the screen merely re-renders', () => {
    const { say } = renderTutor('Day 1 is next.')
    say('Day 1 is next.')

    expect(speak).toHaveBeenCalledOnce()
  })

  it('stops on the face, and says the line again on the next tap', async () => {
    renderTutor('Day 1 is next.')

    await userEvent.click(button('Stop the tutor'))
    expect(cancelSpeech).toHaveBeenCalled()

    await userEvent.click(button('Hear the tutor again'))
    expect(speak).toHaveBeenCalledTimes(2)
  })

  it('waits for a tap when the learner has not touched the page yet', async () => {
    touched(false)
    renderTutor('You are in Section 1.')

    expect(speak).not.toHaveBeenCalled()
    expect(screen.getByText('You are in Section 1.')).toBeVisible()

    await userEvent.click(button('Hear the tutor again'))
    expect(speak).toHaveBeenCalledWith('You are in Section 1.', { rate: 1 })
  })

  it('simply tries where the browser does not say whether the page was touched', () => {
    touched(undefined)
    renderTutor('You are in Section 1.')

    expect(speak).toHaveBeenCalledOnce()
  })

  describe('muting', () => {
    it('silences the tutor at once, on later screens too, and is remembered', async () => {
      const { say } = renderTutor('Day 1 is next.')

      await userEvent.click(button('Mute the tutor'))

      expect(cancelSpeech).toHaveBeenCalled()
      expect(useTutorSoundStore.getState().muted).toBe(true)
      expect(JSON.parse(localStorage.getItem('kuhedu-tutor-sound') ?? '{}')).toMatchObject({
        state: { muted: true },
      })
      // The line is still written, and a new one is not said.
      say('Day 2 is next.')
      expect(screen.getByText('Day 2 is next.')).toBeVisible()
      expect(speak).toHaveBeenCalledOnce()
    })

    it('says nothing by itself for a learner who muted it before', () => {
      useTutorSoundStore.setState({ muted: true })
      renderTutor('You are in Section 1.')

      expect(speak).not.toHaveBeenCalled()
      expect(button('Let the tutor speak')).toHaveAttribute('aria-pressed', 'true')
    })

    it('speaks again from the tap that unmutes it', async () => {
      useTutorSoundStore.setState({ muted: true })
      renderTutor('You are in Section 1.')

      await userEvent.click(button('Let the tutor speak'))

      expect(useTutorSoundStore.getState().muted).toBe(false)
      expect(speak).toHaveBeenCalledOnce()
      expect(button('Mute the tutor')).toBeVisible()
    })

    it('can still be asked for a line while muted', async () => {
      useTutorSoundStore.setState({ muted: true })
      renderTutor('You are in Section 1.')

      await userEvent.click(button('Hear the tutor again'))

      expect(speak).toHaveBeenCalledOnce()
      expect(useTutorSoundStore.getState().muted).toBe(true)
    })
  })

  describe('in the learner’s language', () => {
    it('says a Bengali line with the device’s Bengali voice', () => {
      vi.mocked(hasVoiceFor).mockImplementation((language) => language === 'bn')
      renderTutor('আপনি এখন বিভাগ ১-এ আছেন।', 'bn')

      expect(speak).toHaveBeenCalledWith('আপনি এখন বিভাগ ১-এ আছেন।', { rate: 1, lang: 'bn' })
      expect(screen.getByRole('region', { name: 'আপনার টিউটর' })).toBeVisible()
    })

    it('only writes the line on a device with no voice for it, and never reads it in English', () => {
      renderTutor('আপনি এখন বিভাগ ১-এ আছেন।', 'bn')

      expect(screen.getByText('আপনি এখন বিভাগ ১-এ আছেন।')).toBeVisible()
      expect(speak).not.toHaveBeenCalled()
      // Nothing to hear, so nothing to press.
      expect(screen.queryByRole('button')).toBeNull()
    })
  })

  it('only writes the line on a device that cannot speak at all', () => {
    vi.mocked(isSpeechSupported).mockReturnValue(false)
    renderTutor('You are in Section 1.')

    expect(screen.getByText('You are in Section 1.')).toBeVisible()
    expect(speak).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('falls silent when the screen goes', () => {
    const view = render(<TutorNarrator line="You are in Section 1." />)
    vi.mocked(cancelSpeech).mockClear()

    view.unmount()

    expect(cancelSpeech).toHaveBeenCalled()
  })
})
