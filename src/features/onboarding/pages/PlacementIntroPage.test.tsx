import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '@/shared/lib/i18n'
import { PlacementIntroPage } from './PlacementIntroPage'

const renderPlacementIntro = (language: string) =>
  render(
    <I18nProvider language={language}>
      <MemoryRouter>
        <PlacementIntroPage />
      </MemoryRouter>
    </I18nProvider>,
  )

const skillNames = () =>
  within(screen.getByRole('list'))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

describe('PlacementIntroPage', () => {
  it('explains the test in the learner’s language, including translation', () => {
    renderPlacementIntro('bn')

    expect(
      screen.getByRole('heading', { level: 1, name: 'চলুন, আপনার শুরুর জায়গা খুঁজে নিই' }),
    ).toBeVisible()
    expect(skillNames()).toEqual(['শুনুন', 'বুঝুন', 'বলুন', 'অনুবাদ করুন (প্রয়োজন হলে)'])
    expect(screen.getByText('১০–১৫ মিনিট')).toBeVisible()
    expect(screen.getByRole('link', { name: 'প্লেসমেন্ট টেস্ট শুরু করুন' })).toHaveAttribute(
      'href',
      '/placement-test',
    )
  })

  it('shows all four skills in Hindi', () => {
    renderPlacementIntro('hi')
    expect(skillNames()).toEqual(['सुनें', 'समझें', 'बोलें', 'अनुवाद करें (ज़रूरत हो तो)'])
  })

  it('leaves out translation for learners who chose English only', () => {
    renderPlacementIntro('en')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Let’s find your starting point' }),
    ).toBeVisible()
    expect(skillNames()).toEqual(['Listen', 'Understand', 'Speak'])
    expect(screen.getByText('10–15 minutes')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Start Placement Test' })).toBeVisible()
  })

  it('treats a regional English code as English', () => {
    renderPlacementIntro('en-IN')
    expect(skillNames()).toHaveLength(3)
  })
})
