import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceChips } from './ChoiceChips'

const options = [
  { value: 'a', label: 'Takeaway café' },
  { value: 'b', label: 'বেকারি', lang: 'bn', mark: <span className="sr-only">Done</span> },
  { value: 'c', label: 'Harder', description: 'no hints' },
] as const

describe('ChoiceChips', () => {
  it('is a radio group named by the heading shown above it', () => {
    render(
      <ChoiceChips legend="Change the scenario" options={options} value="a" onChange={vi.fn()} />,
    )

    expect(screen.getByRole('group', { name: 'Change the scenario' })).toBeInTheDocument()
    expect(screen.getByText('Change the scenario')).toBeVisible()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Takeaway café' })).toBeChecked()
  })

  it('names a chip by its label, its description and its mark, and marks the label’s language', () => {
    render(<ChoiceChips legend="Pick" options={options} value="a" onChange={vi.fn()} />)

    expect(screen.getByRole('radio', { name: 'বেকারি Done' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Harder no hints' })).toBeInTheDocument()
    expect(screen.getByText('বেকারি')).toHaveAttribute('lang', 'bn')
    // The mark is not part of the label's language.
    expect(screen.getByText('Done').closest('[lang]')).toBeNull()
  })

  it('calls onChange when a chip is tapped, in either layout', async () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <ChoiceChips legend="Pick" options={options} value="a" onChange={handleChange} />,
    )
    await userEvent.click(screen.getByText('Harder'))
    expect(handleChange).toHaveBeenLastCalledWith('c')

    rerender(
      <ChoiceChips
        legend="Pick"
        options={options}
        value="a"
        onChange={handleChange}
        layout="equal"
      />,
    )
    await userEvent.click(screen.getByText('বেকারি'))
    expect(handleChange).toHaveBeenLastCalledWith('b')
  })

  it('is operable from the keyboard', async () => {
    const handleChange = vi.fn()
    render(<ChoiceChips legend="Pick" options={options} value="a" onChange={handleChange} />)

    await userEvent.tab()
    expect(screen.getByRole('radio', { name: 'Takeaway café' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    expect(handleChange).toHaveBeenCalledWith('b')
  })
})
