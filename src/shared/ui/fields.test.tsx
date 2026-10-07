import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompactSelect } from './CompactSelect'
import { IconButton } from './IconButton'
import { PasswordField } from './PasswordField'
import { SegmentedControl } from './SegmentedControl'
import { SelectField } from './SelectField'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

describe('TextField', () => {
  it('ties the label, hint and error to the input', async () => {
    const handleChange = vi.fn()
    render(
      <TextField
        label="Username"
        hint="Your sign-in name"
        error="Enter your username."
        onChange={handleChange}
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input).toBeInvalid()
    expect(input).toHaveAccessibleDescription('Your sign-in name Enter your username.')
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your username.')

    await userEvent.type(input, 'a')
    expect(handleChange).toHaveBeenCalled()
  })

  it('is valid and undescribed without hint or error, and passes native props through', () => {
    render(<TextField label="Password" type="password" autoComplete="current-password" />)

    const input = screen.getByLabelText('Password')
    expect(input).toBeValid()
    expect(input).not.toHaveAttribute('aria-describedby')
    expect(input).toHaveAttribute('type', 'password')
    expect(input).toHaveAttribute('autocomplete', 'current-password')
  })

  it('keeps a decorative icon out of the way and a trailing control reachable', async () => {
    const handleClear = vi.fn()
    render(
      <TextField
        label="Email address"
        startAdornment={<svg data-testid="icon" />}
        endAdornment={<IconButton label="Clear" onClick={handleClear} />}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Email address' })).toBeInTheDocument()
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(handleClear).toHaveBeenCalledOnce()
  })
})

describe('PasswordField', () => {
  it('hides what is typed until the learner asks to see it', async () => {
    render(<PasswordField label="Password" showLabel="Show password" hideLabel="Hide password" />)

    const input = screen.getByLabelText('Password')
    await userEvent.type(input, 'secret')
    expect(input).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveValue('secret')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })
})

describe('TextAreaField', () => {
  it('renders a labelled multi-line field', async () => {
    const handleChange = vi.fn()
    render(<TextAreaField label="Headline" value="Hello" onChange={handleChange} lang="bn" />)

    const field = screen.getByRole('textbox', { name: 'Headline' })
    expect(field.tagName).toBe('TEXTAREA')
    expect(field).toHaveValue('Hello')
    expect(field).toHaveAttribute('lang', 'bn')
    await userEvent.type(field, '!')
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('SelectField', () => {
  it('renders the options and reports a choice', async () => {
    const handleChange = vi.fn()
    render(
      <SelectField
        label="Language"
        value="bn"
        onChange={handleChange}
        options={[
          { value: 'bn', label: 'বাংলা' },
          { value: 'hi', label: 'हिन्दी' },
        ]}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(select).toHaveValue('bn')
    expect(screen.getAllByRole('option')).toHaveLength(2)
    await userEvent.selectOptions(select, 'hi')
    expect(handleChange).toHaveBeenCalled()
  })
})

describe('CompactSelect', () => {
  const options = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'বাংলা', lang: 'bn' },
  ]

  it('is named by its label, shows the current choice and reports a new one', async () => {
    const handleChange = vi.fn()
    render(
      <CompactSelect
        label="Language"
        icon={<svg data-testid="icon" />}
        options={options}
        value="en"
        onChange={(event) => handleChange(event.target.value)}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(select).toHaveValue('en')
    expect(screen.getByRole('option', { name: 'বাংলা' })).toHaveAttribute('lang', 'bn')
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden', 'true')

    await userEvent.selectOptions(select, 'bn')
    expect(handleChange).toHaveBeenCalledWith('bn')
  })
})

describe('IconButton', () => {
  it('is named by its label and is a plain button by default', async () => {
    const handleClick = vi.fn()
    render(
      <IconButton label="Remove language" onClick={handleClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    )

    const button = screen.getByRole('button', { name: 'Remove language' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('does nothing when disabled', async () => {
    const handleClick = vi.fn()
    render(
      <IconButton label="Move up" disabled onClick={handleClick}>
        <svg aria-hidden="true" />
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Move up' }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('can dress a link, which keeps the label as its name', () => {
    render(
      <IconButton asChild label="Back">
        <a href="/">
          <svg aria-hidden="true" />
        </a>
      </IconButton>,
    )
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('SegmentedControl', () => {
  const options = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'বাংলা', lang: 'bn' },
  ]

  it('is a named radio group with the current value checked', () => {
    render(<SegmentedControl legend="Language" options={options} value="en" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'বাংলা' })).not.toBeChecked()
    expect(screen.getByText('বাংলা')).toHaveAttribute('lang', 'bn')
  })

  it('reports the chosen value', async () => {
    const handleChange = vi.fn()
    render(
      <SegmentedControl legend="Language" options={options} value="en" onChange={handleChange} />,
    )
    await userEvent.click(screen.getByText('বাংলা'))
    expect(handleChange).toHaveBeenCalledWith('bn')
  })

  it('can share the full width equally between the choices', () => {
    render(
      <SegmentedControl
        fullWidth
        legend="Language"
        options={options}
        value="en"
        onChange={vi.fn()}
      />,
    )
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.closest('label')).toHaveClass('flex-1')
    }
  })
})
