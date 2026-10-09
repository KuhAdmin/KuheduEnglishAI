import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { ListItem } from './ListItem'

describe('ListItem', () => {
  it('is a button named by its title and second line, with a decorative icon', async () => {
    const handleClick = vi.fn()
    render(
      <ListItem
        icon={<svg data-testid="icon" />}
        title="Language"
        description="বাংলা"
        onClick={handleClick}
      />,
    )

    const row = screen.getByRole('button', { name: 'Language বাংলা' })
    expect(row).toHaveAttribute('type', 'button')
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true')

    await userEvent.click(row)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('can be a link, with the icon, text and arrow drawn inside it', () => {
    render(
      <MemoryRouter>
        <ListItem asChild icon={<svg />} title="Voice settings">
          <Link to="/profile/voice" />
        </ListItem>
      </MemoryRouter>,
    )

    const row = screen.getByRole('link', { name: 'Voice settings' })
    expect(row).toHaveAttribute('href', '/profile/voice')
    expect(row).not.toHaveAttribute('type')
    expect(row).toContainElement(screen.getByText('Voice settings'))
  })

  it('can be disabled', () => {
    render(<ListItem title="Notifications" disabled />)
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeDisabled()
  })
})
