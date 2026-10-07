import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemePicker, type ThemePickerOption } from './ThemePicker'

const options: ThemePickerOption[] = [
  {
    value: 'auto',
    label: 'Auto',
    hint: 'Matches your phone',
    preview: ['indigo-dawn', 'midnight-iris'],
  },
  { value: 'morning-bliss', label: 'Morning Bliss', preview: ['morning-bliss'] },
  { value: 'sage-dusk', label: 'Sage Dusk', preview: ['sage-dusk'] },
]

describe('ThemePicker', () => {
  it('renders a named radio per theme with the current one checked', () => {
    render(<ThemePicker legend="Color theme" options={options} value="auto" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Color theme' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: /Auto/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Sage Dusk' })).not.toBeChecked()
  })

  it('calls onChange with the chosen theme', async () => {
    const handleChange = vi.fn()
    render(
      <ThemePicker legend="Color theme" options={options} value="auto" onChange={handleChange} />,
    )

    await userEvent.click(screen.getByRole('radio', { name: 'Sage Dusk' }))
    expect(handleChange).toHaveBeenCalledWith('sage-dusk')
  })

  it('is operable from the keyboard', async () => {
    const handleChange = vi.fn()
    render(
      <ThemePicker legend="Color theme" options={options} value="auto" onChange={handleChange} />,
    )

    await userEvent.tab()
    expect(screen.getByRole('radio', { name: /Auto/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(handleChange).toHaveBeenCalledWith('morning-bliss')
  })

  it('previews each theme with its own tokens', () => {
    const { container } = render(
      <ThemePicker legend="Color theme" options={options} value="auto" onChange={vi.fn()} />,
    )
    expect(container.querySelectorAll('[data-theme="sage-dusk"]')).toHaveLength(1)
    // "Auto" shows a light and a dark half.
    expect(container.querySelectorAll('[data-theme="midnight-iris"]')).toHaveLength(1)
  })
})
