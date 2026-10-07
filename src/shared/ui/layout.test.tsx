import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { fillText } from '@/shared/lib/i18n'
import { ProgressBar } from './ProgressBar'
import { StepScreen } from './StepScreen'

describe('StepScreen', () => {
  it('lays out a heading, the step and its pinned action', () => {
    render(
      <StepScreen title="Choose your language" subtitle="Pick one." footer={<button>Next</button>}>
        <p>The question</p>
      </StepScreen>,
    )

    const heading = screen.getByRole('heading', { level: 1, name: 'Choose your language' })
    expect(heading).not.toHaveAttribute('tabindex')
    expect(screen.getByText('Pick one.')).toBeInTheDocument()
    expect(screen.getByRole('main')).toContainElement(screen.getByText('The question'))
    expect(screen.getByRole('contentinfo')).toContainElement(
      screen.getByRole('button', { name: 'Next' }),
    )
  })

  it('shows a top bar and lets the caller move focus to the heading', () => {
    const heading = createRef<HTMLHeadingElement>()
    render(
      <StepScreen title="Listen" topBar={<nav>Progress</nav>} footer={null} headingRef={heading}>
        <p>Step</p>
      </StepScreen>,
    )

    expect(screen.getByRole('navigation')).toHaveTextContent('Progress')
    heading.current?.focus()
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })
})

describe('ProgressBar', () => {
  it('reports how far along it is, by name', () => {
    render(<ProgressBar value={0.42} label="Listen" />)
    const bar = screen.getByRole('progressbar', { name: 'Listen' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it.each([
    [-1, '0'],
    [7, '100'],
    [Number.NaN, '0'],
  ])('keeps %s within the scale', (value, shown) => {
    render(<ProgressBar value={value} label="Speak" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', shown)
  })
})

describe('fillText', () => {
  it('puts values where the text asks for them, wherever that is', () => {
    expect(fillText('Level {level}', { level: 'A1' })).toBe('Level A1')
    expect(fillText('{language} ভাষায় দেখুন', { language: 'বাংলা' })).toBe('বাংলা ভাষায় দেখুন')
    expect(fillText('{a} and {a}', { a: 'x' })).toBe('x and x')
  })

  it('leaves an unknown placeholder visible', () => {
    expect(fillText('Welcome to {brand}', { level: 'A1' })).toBe('Welcome to {brand}')
    expect(fillText('No placeholders', {})).toBe('No placeholders')
  })
})
