import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HEADLINE_INTERVAL_MS, HeadlineSlider } from './HeadlineSlider'

const headlines = [
  { lang: 'bn', text: 'বাংলা শিরোনাম', subtext: '' },
  { lang: 'hi', text: 'हिन्दी शीर्षक', subtext: 'उपशीर्षक' },
  { lang: 'en', text: 'English headline', subtext: '' },
]
const renderSlider = (list = headlines, language: string | null = null) =>
  render(<HeadlineSlider headlines={list} language={language} />)

/** The one headline assistive technology (and the learner) can currently see. */
const shownHeadline = () => screen.getByRole('heading', { level: 1 })
const slideOf = (text: string) => screen.getByText(text).parentElement
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('HeadlineSlider', () => {
  it('starts on the first headline, without an entrance slide', () => {
    renderSlider()

    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
    expect(slideOf('বাংলা শিরোনাম')).toHaveAttribute('lang', 'bn')
    expect(slideOf('বাংলা শিরোনাম')).not.toHaveClass('animate-slide-in-left')
    // The others keep their space (so nothing jumps) but are hidden from everyone.
    expect(slideOf('English headline')).toHaveClass('invisible')
    expect(slideOf('English headline')).toHaveAttribute('aria-hidden', 'true')
  })

  it('slides to the next language every 5 seconds and wraps around', () => {
    renderSlider()
    expect(HEADLINE_INTERVAL_MS).toBe(5000)

    wait(4999)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')

    wait(1)
    expect(shownHeadline()).toHaveTextContent('हिन्दी शीर्षक')
    expect(screen.getByText('उपशीर्षक')).toBeVisible()
    // The new one comes in from the right while the old one leaves to the left.
    expect(slideOf('हिन्दी शीर्षक')).toHaveClass('animate-slide-in-left')
    expect(slideOf('বাংলা শিরোনাম')).toHaveClass('animate-slide-out-left')
    expect(slideOf('বাংলা শিরোনাম')).toHaveAttribute('aria-hidden', 'true')

    wait(5000)
    expect(shownHeadline()).toHaveTextContent('English headline')
    expect(slideOf('বাংলা শিরোনাম')).toHaveClass('invisible')

    wait(5000)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
    expect(slideOf('বাংলা শিরোনাম')).toHaveClass('animate-slide-in-left')
  })

  it('slides to the headline of the language the visitor chooses, and the turns end', () => {
    const { rerender } = renderSlider()
    wait(5000)
    expect(shownHeadline()).toHaveTextContent('हिन्दी शीर्षक')

    rerender(<HeadlineSlider headlines={headlines} language="en" />)
    expect(shownHeadline()).toHaveTextContent('English headline')
    // From the one that was on show, as when they take turns.
    expect(slideOf('English headline')).toHaveClass('animate-slide-in-left')
    expect(slideOf('हिन्दी शीर्षक')).toHaveClass('animate-slide-out-left')

    wait(20_000)
    expect(shownHeadline()).toHaveTextContent('English headline')

    // Choosing again slides again.
    rerender(<HeadlineSlider headlines={headlines} language="bn" />)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
    expect(slideOf('English headline')).toHaveClass('animate-slide-out-left')
  })

  it('opens on the headline of a language chosen earlier, still, and without an entrance slide', () => {
    renderSlider(headlines, 'hi-IN')

    expect(shownHeadline()).toHaveTextContent('हिन्दी शीर्षक')
    expect(slideOf('हिन्दी शीर्षक')).not.toHaveClass('animate-slide-in-left')
    wait(20_000)
    expect(shownHeadline()).toHaveTextContent('हिन्दी शीर्षक')
  })

  it('shows the English headline for a language that has none, and the first where there is no English', () => {
    const { unmount } = renderSlider(headlines, 'ta')
    expect(shownHeadline()).toHaveTextContent('English headline')
    unmount()

    renderSlider(headlines.slice(0, 2), 'ta')
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
    wait(20_000)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
  })

  it('does not rotate while the tab is in the background', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    renderSlider()

    wait(15_000)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')

    hidden.mockReturnValue(false)
    wait(5000)
    expect(shownHeadline()).toHaveTextContent('हिन्दी शीर्षक')
    hidden.mockRestore()
  })

  it('shows a single headline plainly, with no controls of its own', () => {
    renderSlider(headlines.slice(2))

    wait(20_000)
    expect(shownHeadline()).toHaveTextContent('English headline')
    // What stops the turns is the language picker beside it, on the page.
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('copes when the admin shortens the list while it is showing a later headline', () => {
    const { rerender } = renderSlider()
    wait(10_000)
    expect(shownHeadline()).toHaveTextContent('English headline')

    rerender(<HeadlineSlider headlines={headlines.slice(0, 2)} />)
    expect(shownHeadline()).toHaveTextContent('বাংলা শিরোনাম')
  })
})
