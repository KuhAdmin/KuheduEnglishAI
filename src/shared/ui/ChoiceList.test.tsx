import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceList, type ChoiceListOption } from './ChoiceList'

const options: ChoiceListOption<'a' | 'b' | 'c'>[] = [
  { value: 'a', label: 'Alpha', description: 'First' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', media: <img src="/flags/in.svg" alt="" /> },
]

describe('ChoiceList', () => {
  it('renders a named radio group with the current value checked', () => {
    render(<ChoiceList legend="Pick one" options={options} value="b" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Pick one' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Alpha/ })).not.toBeChecked()
    expect(screen.getByText('First')).toBeInTheDocument()
  })

  it('has nothing checked when value is null', () => {
    render(<ChoiceList legend="Pick one" options={options} value={null} onChange={vi.fn()} />)
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('calls onChange when a card is tapped', async () => {
    const handleChange = vi.fn()
    render(<ChoiceList legend="Pick one" options={options} value="a" onChange={handleChange} />)

    await userEvent.click(screen.getByText('Gamma'))
    expect(handleChange).toHaveBeenCalledWith('c')
  })

  it('is operable from the keyboard', async () => {
    const handleChange = vi.fn()
    render(<ChoiceList legend="Pick one" options={options} value="a" onChange={handleChange} />)

    await userEvent.tab()
    expect(screen.getByRole('radio', { name: /Alpha/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(handleChange).toHaveBeenCalledWith('b')
  })
})
