import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LanguageChoiceList, type LanguageChoice } from './LanguageChoiceList'

const languages: LanguageChoice[] = [
  { code: 'bn', nativeName: 'বাংলা', caption: 'Bengali', flagUrl: '/flags/in.svg' },
  { code: 'mr', nativeName: 'मराठी', caption: '', flagUrl: null },
  { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: '/flags/us.svg' },
]

describe('LanguageChoiceList', () => {
  it('names each language in its own script, with its caption in brackets', () => {
    render(
      <LanguageChoiceList legend="Language" languages={languages} value="bn" onChange={vi.fn()} />,
    )

    expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'বাংলা (Bengali)' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'मराठी' })).not.toBeChecked()
    expect(screen.getByText('বাংলা')).toHaveAttribute('lang', 'bn')
    expect(screen.getByText('(Bengali)')).toHaveAttribute('lang', 'en')
  })

  it('has nothing checked when the value is not one of the languages', () => {
    render(
      <LanguageChoiceList
        legend="Language"
        languages={languages}
        value={null}
        onChange={vi.fn()}
      />,
    )

    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('reports the code of the language tapped', async () => {
    const handleChange = vi.fn()
    render(
      <LanguageChoiceList
        legend="Language"
        languages={languages}
        value="bn"
        onChange={handleChange}
      />,
    )

    await userEvent.click(screen.getByText('English'))
    expect(handleChange).toHaveBeenCalledWith('en')
  })

  it('shows initials for a language without a flag, or whose flag fails to load', () => {
    const { container } = render(
      <LanguageChoiceList legend="Language" languages={languages} value="bn" onChange={vi.fn()} />,
    )

    expect(screen.getByText('mr')).toBeInTheDocument()

    const flag = container.querySelector('img[src="/flags/in.svg"]')
    if (!flag) throw new Error('The Bengali flag was not drawn')
    fireEvent.error(flag)
    expect(container.querySelector('img[src="/flags/in.svg"]')).not.toBeInTheDocument()
    expect(screen.getByText('bn')).toBeInTheDocument()
  })
})
