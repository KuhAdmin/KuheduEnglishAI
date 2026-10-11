import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TutorBar } from './TutorBar'

describe('TutorBar', () => {
  it('shows what the tutor says under the face, as a named part of the screen', () => {
    render(<TutorBar label="Your tutor" avatar="female" text="Tap Week 1 to begin." />)

    const tutor = screen.getByRole('region', { name: 'Your tutor' })
    const line = within(tutor).getByText('Tap Week 1 to begin.')
    expect(line).toBeVisible()
    // The face is decoration: the region is named and the line is written.
    expect(within(tutor).queryByRole('img')).toBeNull()
    // The face comes first, in a row of its own, and the line after it.
    const face = tutor.querySelector('svg')
    expect(face).not.toBeNull()
    expect(face?.compareDocumentPosition(line)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(line.contains(face)).toBe(false)
  })

  it('has nothing to press on a device that cannot say the line', () => {
    render(<TutorBar label="Your tutor" avatar="male" text="Tap Week 1 to begin." />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('says the line again from the face, and mutes from its own button', async () => {
    const onReplay = vi.fn()
    const onToggle = vi.fn()
    render(
      <TutorBar
        label="Your tutor"
        avatar="male"
        text="Tap Week 1 to begin."
        replay={{ label: 'Hear the tutor again', onClick: onReplay }}
        sound={{ muted: false, label: 'Mute the tutor', onToggle }}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Hear the tutor again' }))
    expect(onReplay).toHaveBeenCalledOnce()

    const mute = screen.getByRole('button', { name: 'Mute the tutor' })
    expect(mute).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(mute)
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('says in words, not by its icon alone, that the tutor is muted', () => {
    render(
      <TutorBar
        label="Your tutor"
        avatar="male"
        text="Tap Week 1 to begin."
        sound={{ muted: true, label: 'Let the tutor speak', onToggle: () => {} }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Let the tutor speak' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('gives a screen’s own control a place before the face, in the tutor’s first row', () => {
    render(
      <TutorBar
        label="Your tutor"
        avatar="male"
        text="Tap Week 1 to begin."
        leading={<a href="/home">Back to your journey</a>}
        replay={{ label: 'Hear the tutor again', onClick: () => {} }}
        sound={{ muted: false, label: 'Mute the tutor', onToggle: () => {} }}
      />,
    )

    const tutor = screen.getByRole('region', { name: 'Your tutor' })
    const back = within(tutor).getByRole('link', { name: 'Back to your journey' })
    const face = within(tutor).getByRole('button', { name: 'Hear the tutor again' })
    // Reached first by keyboard, and in the row of the face, not in the line under it.
    expect(back.compareDocumentPosition(face)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(back.parentElement?.parentElement).toBe(face.parentElement)
  })

  it('marks a line in another language, and takes layout classes', () => {
    render(
      <TutorBar
        label="আপনার টিউটর"
        avatar="male"
        text="শুরু করতে ট্যাপ করুন।"
        lang="bn"
        className="py-2"
      />,
    )

    const tutor = screen.getByRole('region', { name: 'আপনার টিউটর' })
    expect(tutor).toHaveAttribute('lang', 'bn')
    expect(tutor).toHaveClass('py-2')
  })
})
