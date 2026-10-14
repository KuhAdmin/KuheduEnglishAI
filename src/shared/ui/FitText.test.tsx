import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FitText } from './FitText'
import { fittedSize } from './fittedSize'

describe('fittedSize', () => {
  it('leaves a line that fits at its own size', () => {
    expect(fittedSize(14, 300, 280, 11)).toBe(14)
    expect(fittedSize(14, 300, 300, 11)).toBe(14)
  })

  it('draws a line that is too long just small enough, and never rounds up', () => {
    // 14px needs 344px; 326px are there.
    expect(fittedSize(14, 326, 344, 11)).toBe(13.2)
    expect(fittedSize(14, 296, 344, 11)).toBe(12)
  })

  it('gives up under the smallest size, so that the line wraps and can be read', () => {
    expect(fittedSize(14, 200, 344, 11)).toBeNull()
    expect(fittedSize(14, 271, 344, 11)).toBe(11)
  })
})

describe('FitText', () => {
  it('is a paragraph with its text, and takes what a paragraph takes', () => {
    render(
      <FitText className="text-sm" data-testid="note">
        It is not kept.
      </FitText>,
    )

    const note = screen.getByTestId('note')
    expect(note.tagName).toBe('P')
    expect(note).toHaveTextContent('It is not kept.')
    expect(note).toHaveClass('text-sm')
  })
})
