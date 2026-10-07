import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders a button of type "button" by default and handles clicks', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('applies variant, size and layout classes', () => {
    render(
      <Button variant="secondary" size="lg" fullWidth className="mt-4">
        Next
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Next' })
    expect(button).toHaveClass('bg-primary-soft', 'min-h-14', 'w-full', 'mt-4')
  })

  it('does not fire clicks when disabled', async () => {
    const handleClick = vi.fn()
    render(
      <Button disabled onClick={handleClick}>
        Save
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders the child element when asChild is set', () => {
    render(
      <Button asChild>
        <a href="/onboarding">Get Started</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Get Started' })
    expect(link).toHaveAttribute('href', '/onboarding')
    expect(link).toHaveClass('bg-primary')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
