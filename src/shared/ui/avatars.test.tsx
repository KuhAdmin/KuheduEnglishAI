import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { MouthShape } from '@/shared/lib/audio/lipSync'
import { FemaleAvatar } from './FemaleAvatar'
import { MaleAvatar } from './MaleAvatar'
import { TutorAvatar } from './TutorAvatar'

const part = (container: HTMLElement, name: string) => {
  const found = container.querySelector(`[data-part="${name}"]`)
  if (!found) throw new Error(`no ${name} was drawn`)
  return found
}
const drawing = (container: HTMLElement) => part(container, 'mouth').outerHTML

describe.each([
  ['MaleAvatar', MaleAvatar],
  ['FemaleAvatar', FemaleAvatar],
])('%s', (_name, Avatar) => {
  it('is decoration unless it is given a name', () => {
    const { container, rerender } = render(<Avatar />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')

    rerender(<Avatar label="Ravi, your tutor" />)
    expect(screen.getByRole('img', { name: 'Ravi, your tutor' })).toBeInTheDocument()
  })

  it('draws a different mouth for every shape of speech', () => {
    const shapes: MouthShape[] = ['rest', 'closed', 'mid', 'open', 'wide', 'round']
    const drawings = shapes.map((mouth) => {
      const { container, unmount } = render(<Avatar mouth={mouth} />)
      expect(container.firstElementChild).toHaveAttribute('data-mouth', mouth)
      const drawn = drawing(container)
      unmount()
      return drawn
    })

    expect(new Set(drawings).size).toBe(shapes.length)
  })

  it('smiles widely when asked, but not over what is being said', () => {
    const { container, rerender } = render(<Avatar />)
    const closed = drawing(container)

    rerender(<Avatar mood="smile" />)
    const smile = drawing(container)
    expect(smile).not.toBe(closed)
    // A wide smile shows teeth.
    expect(part(container, 'mouth').querySelector('.fill-\\(--figure-teeth\\)')).not.toBeNull()

    rerender(<Avatar mood="smile" mouth="open" />)
    const speaking = drawing(container)
    rerender(<Avatar mouth="open" />)
    expect(drawing(container)).toBe(speaking)
  })

  it('gives a thumbs up, with the smile, to encourage', () => {
    const { container, rerender } = render(<Avatar mood="smile" />)
    const smile = drawing(container)
    expect(part(container, 'thumbs-up')).toHaveAttribute('data-shown', 'false')
    expect(part(container, 'thumbs-up')).toHaveClass('opacity-0')

    rerender(<Avatar mood="encourage" />)
    expect(part(container, 'thumbs-up')).toHaveAttribute('data-shown', 'true')
    expect(part(container, 'thumbs-up')).not.toHaveClass('opacity-0')
    expect(drawing(container)).toBe(smile)
  })

  it('blinks both eyes, and keeps them open where motion is reduced', () => {
    const { container } = render(<Avatar />)
    const lids = container.querySelectorAll('[data-part="eyelid"]')

    expect(lids).toHaveLength(2)
    for (const lid of lids) {
      // Hidden unless the animation shows it, so a still picture has open eyes.
      expect(lid).toHaveClass('animate-blink', 'opacity-0', 'motion-reduce:animate-none')
    }
  })

  it('moves its head a little while it speaks, and holds it still otherwise', () => {
    const { container, rerender } = render(<Avatar />)
    const heads = () => [...container.querySelectorAll('[data-part="head"]')]

    expect(heads().length).toBeGreaterThan(0)
    for (const head of heads()) {
      expect(head).toHaveAttribute('data-speaking', 'false')
      // Two movements of different lengths, both held where they are, and none without motion.
      expect(head).toHaveClass(
        'animate-head-sway',
        '[animation-play-state:paused]',
        'motion-reduce:animate-none',
      )
      expect(head.firstElementChild).toHaveClass(
        'animate-head-nod',
        '[animation-play-state:paused]',
        'motion-reduce:animate-none',
      )
    }

    // Between two words the lips are closed, and he is still speaking.
    rerender(<Avatar mouth="closed" />)
    for (const head of heads()) {
      expect(head).toHaveAttribute('data-speaking', 'true')
      expect(head).toHaveClass('[animation-play-state:running]')
      expect(head.firstElementChild).toHaveClass('[animation-play-state:running]')
    }
    // The face is part of the head, so it moves with it.
    expect(heads().some((head) => head.querySelector('[data-part="mouth"]'))).toBe(true)
  })

  it('comes in two sizes and takes layout classes and native props', () => {
    const { container, rerender } = render(<Avatar className="mx-auto" id="tutor" />)
    expect(container.firstElementChild).toHaveClass('w-40', 'mx-auto')
    expect(container.firstElementChild).toHaveAttribute('id', 'tutor')

    rerender(<Avatar size="md" />)
    expect(container.firstElementChild).toHaveClass('w-28')
    rerender(<Avatar size="sm" />)
    expect(container.firstElementChild).toHaveClass('w-14')
  })
})

describe('TutorAvatar', () => {
  it('draws the face asked for, with everything it can do', () => {
    const { container, rerender } = render(<TutorAvatar avatar="male" mood="encourage" />)
    const male = container.innerHTML
    expect(container.firstElementChild).toHaveAttribute('data-mood', 'encourage')

    rerender(<TutorAvatar avatar="female" mood="encourage" />)
    expect(container.innerHTML).not.toBe(male)
    expect(part(container, 'thumbs-up')).toHaveAttribute('data-shown', 'true')

    rerender(<TutorAvatar avatar="female" mouth="open" label="Female tutor" />)
    expect(screen.getByRole('img', { name: 'Female tutor' })).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('data-mouth', 'open')
  })
})
