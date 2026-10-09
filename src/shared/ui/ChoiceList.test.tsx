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

  it('can be locked once the choice is made: it stays readable but cannot change', async () => {
    const handleChange = vi.fn()
    render(
      <ChoiceList legend="Pick one" options={options} value="b" onChange={handleChange} disabled />,
    )

    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked()
    await userEvent.click(screen.getByText('Gamma'))
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('can give an option a control of its own, which does not choose it', async () => {
    const handleChange = vi.fn()
    const handlePlay = vi.fn()
    render(
      <ChoiceList
        legend="Pick one"
        value="a"
        onChange={handleChange}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta', action: <button onClick={handlePlay}>Play Beta</button> },
        ]}
      />,
    )

    const play = screen.getByRole('button', { name: 'Play Beta' })
    // A button may not sit inside a label.
    expect(play.closest('label')).toBeNull()
    await userEvent.click(play)
    expect(handlePlay).toHaveBeenCalledOnce()
    expect(handleChange).not.toHaveBeenCalled()

    // The option's name is its own, without the control's.
    await userEvent.click(screen.getByRole('radio', { name: 'Beta' }))
    expect(handleChange).toHaveBeenCalledWith('b')
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
