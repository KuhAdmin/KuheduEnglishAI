import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfileAvatar } from './ProfileAvatar'

const images = (container: HTMLElement) => [...container.querySelectorAll('img')]

describe('ProfileAvatar', () => {
  it('puts the male picture on the front of a flipping coin and the female on the back', () => {
    const { container } = render(
      <ProfileAvatar maleImageUrl="/m.svg" femaleImageUrl="/f.svg" phase={0.5} />,
    )
    const [male, female] = images(container)
    const coin = male?.parentElement

    expect(male).toHaveAttribute('src', '/m.svg')
    expect(female).toHaveAttribute('src', '/f.svg')
    expect(coin).toBe(female?.parentElement)
    expect(coin).toHaveClass('animate-coin-flip', 'transform-3d')
    expect(coin?.style.animationDelay).toBe('-0.5s')
    // Each face is hidden while it points away; the back one starts turned away.
    expect(male).toHaveClass('backface-hidden')
    expect(male).not.toHaveClass('rotate-y-180')
    expect(female).toHaveClass('backface-hidden', 'rotate-y-180')
  })

  it('is decorative and stops flipping when motion is reduced', () => {
    const { container } = render(<ProfileAvatar maleImageUrl="/m.svg" femaleImageUrl="/f.svg" />)
    const [male] = images(container)

    expect(male).toHaveAttribute('alt', '')
    expect(male?.parentElement).toHaveClass('motion-reduce:animate-none')
  })

  it('shows the remaining picture, still, when one fails to load', () => {
    const { container } = render(<ProfileAvatar maleImageUrl="/m.svg" femaleImageUrl="/f.svg" />)
    const [male] = images(container)
    if (!male) throw new Error('expected an image')
    fireEvent.error(male)

    const remaining = images(container)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toHaveAttribute('src', '/f.svg')
    // It is now the only face, so it must face the viewer and stay still.
    expect(remaining[0]).not.toHaveClass('rotate-y-180')
    expect(remaining[0]?.parentElement).not.toHaveClass('animate-coin-flip')
  })

  it('falls back to an icon when neither picture loads', () => {
    const { container } = render(<ProfileAvatar maleImageUrl="/m.svg" femaleImageUrl="/f.svg" />)
    for (const image of images(container)) fireEvent.error(image)

    expect(images(container)).toHaveLength(0)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('does not animate when both pictures are the same', () => {
    const { container } = render(
      <ProfileAvatar maleImageUrl="/same.svg" femaleImageUrl="/same.svg" />,
    )

    expect(images(container)).toHaveLength(1)
    expect(images(container)[0]?.parentElement).not.toHaveClass('animate-coin-flip')
  })
})
