import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultLandingConfig, LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { LANGUAGES_CONFIG_NAME } from '@/shared/lib/appConfig/languagesConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { AppLanguageProvider, useLanguageStore } from '@/shared/lib/i18n'
import { LandingPage } from './LandingPage'

const renderLandingPage = () =>
  render(
    <AppLanguageProvider>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </AppLanguageProvider>,
  )

const [bengali, hindi, english] = defaultLandingConfig.overlay.headlines
if (!bengali || !hindi || !english) throw new Error('expected three default headlines')

/** The picker of the language the visitor learns in, whatever language its heading is in. */
const languages = () => within(screen.getByRole('group'))
const shownHeadline = () => screen.getByRole('heading', { level: 1 })

beforeEach(() => {
  localStorage.clear()
  useLanguageStore.setState({ language: null })
})

describe('LandingPage', () => {
  it('renders the built-in defaults when the admin has saved nothing', () => {
    renderLandingPage()

    // The Bengali headline shows first; Hindi and English wait their turn.
    const headline = screen.getByRole('heading', { level: 1 })
    expect(headline).toHaveTextContent(bengali.text)
    expect(headline.closest('[lang]')).toHaveAttribute('lang', 'bn')
    expect(screen.getByText('Kuhedu Lingo')).toBeInTheDocument()
    expect(screen.getByText('The Fluency App')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/sign-up')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  it('renders the logo, hero image and overlay text the admin saved', () => {
    settingsRepository.write(LANDING_CONFIG_NAME, {
      brand: { logoUrl: '/uploads/logo.png', name: 'Acme English', tagline: 'Talk more.' },
      hero: { imageUrl: 'https://cdn.example.com/hero.webp', imageAlt: 'Friends chatting' },
      overlay: {
        headlines: [
          { lang: 'en', text: 'Speak with confidence', subtext: 'Daily' },
          { lang: 'ta', text: 'நம்பிக்கையுடன் பேசுங்கள்' },
        ],
      },
      cta: { primaryLabel: 'Start now' },
    })
    const { container } = renderLandingPage()

    const headline = screen.getByRole('heading', { name: 'Speak with confidence' })
    expect(headline.closest('[lang]')).toHaveAttribute('lang', 'en')
    // A headline may be in a language that is not offered; the picker lists those that are.
    expect(languages().getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('Acme English')).toBeInTheDocument()
    expect(screen.getByText('Talk more.')).toBeInTheDocument()
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Friends chatting' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/hero.webp',
    )
    expect(container.querySelector('img[src="/uploads/logo.png"]')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start now' })).toBeInTheDocument()
  })

  it('updates straight away when the admin saves while the page is open', () => {
    renderLandingPage()

    act(() => {
      settingsRepository.write(LANDING_CONFIG_NAME, {
        overlay: { headlines: [{ lang: 'en', text: 'Fresh headline' }] },
      })
    })
    expect(screen.getByRole('heading', { name: 'Fresh headline' })).toBeInTheDocument()
    // One headline or several, the language is still there to choose.
    expect(languages().getAllByRole('radio')).toHaveLength(3)

    act(() => settingsRepository.remove(LANDING_CONFIG_NAME))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bengali.text)
  })

  describe('the language a visitor learns in', () => {
    it('offers the languages by their own names, with none chosen for a first visit', () => {
      renderLandingPage()

      expect(
        screen.getByRole('group', { name: 'Choose the language you learn in' }),
      ).toBeInTheDocument()
      const offered = languages().getAllByRole('radio')
      expect(offered.map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)).toEqual([
        'বাংলা',
        'हिन्दी',
        'English',
      ])
      for (const radio of offered) expect(radio).not.toBeChecked()
      expect(languages().getByText('বাংলা')).toHaveAttribute('lang', 'bn')
      expect(useLanguageStore.getState().language).toBeNull()
    })

    it('keeps the choice for the whole app, and shows the headline and the picker in it', async () => {
      renderLandingPage()

      await userEvent.click(languages().getByText('हिन्दी'))

      // The same place the account screen and every step of onboarding read it from.
      expect(useLanguageStore.getState().language).toBe('hi')
      expect(languages().getByRole('radio', { name: 'हिन्दी' })).toBeChecked()
      expect(shownHeadline()).toHaveTextContent(hindi.text)
      expect(screen.getByRole('group', { name: 'जिस भाषा में सीखना है, वह चुनें' })).toBeVisible()
      expect(document.documentElement).toHaveAttribute('lang', 'hi')

      // And it can be changed.
      await userEvent.click(languages().getByText('English'))
      expect(useLanguageStore.getState().language).toBe('en')
      expect(shownHeadline()).toHaveTextContent(english.text)
    })

    it('opens on the language chosen on an earlier visit', () => {
      useLanguageStore.setState({ language: 'bn' })
      renderLandingPage()

      expect(languages().getByRole('radio', { name: 'বাংলা' })).toBeChecked()
      expect(shownHeadline()).toHaveTextContent(bengali.text)
      expect(screen.getByRole('group', { name: 'যে ভাষায় শিখবেন তা বেছে নিন' })).toBeVisible()
    })

    it('offers the languages the admin saved, and ticks none if the visitor’s was removed', () => {
      useLanguageStore.setState({ language: 'hi' })
      settingsRepository.write(LANGUAGES_CONFIG_NAME, {
        defaultCode: 'ta',
        languages: [
          { code: 'ta', nativeName: 'தமிழ்', caption: 'Tamil', flagUrl: null },
          { code: 'en', nativeName: 'English', caption: 'English only', flagUrl: null },
        ],
      })
      renderLandingPage()

      const offered = languages().getAllByRole('radio')
      expect(offered).toHaveLength(2)
      for (const radio of offered) expect(radio).not.toBeChecked()
      expect(languages().getByRole('radio', { name: 'தமிழ்' })).toBeInTheDocument()
    })
  })

  it('still shows a headline saved in the earlier single-headline format', () => {
    settingsRepository.write(LANDING_CONFIG_NAME, {
      overlay: { headline: 'Old format headline', headlineLang: 'en' },
    })
    renderLandingPage()
    expect(screen.getByRole('heading', { name: 'Old format headline' })).toBeInTheDocument()
  })
})
