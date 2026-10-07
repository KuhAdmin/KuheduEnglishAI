import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { defaultLandingConfig, LANDING_CONFIG_NAME } from '@/shared/lib/appConfig/landingConfig'
import { settingsRepository } from '@/shared/lib/appConfig/settingsRepository'
import { LandingPage } from './LandingPage'

const renderLandingPage = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )

const [bengali] = defaultLandingConfig.overlay.headlines
if (!bengali) throw new Error('expected a default headline')

beforeEach(() => localStorage.clear())

describe('LandingPage', () => {
  it('renders the built-in defaults when the admin has saved nothing', () => {
    renderLandingPage()

    // The Bengali headline shows first; Hindi and English wait their turn.
    const headline = screen.getByRole('heading', { level: 1 })
    expect(headline).toHaveTextContent(bengali.text)
    expect(headline.closest('[lang]')).toHaveAttribute('lang', 'bn')
    expect(screen.getByRole('button', { name: 'বাংলা' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'हिन्दी' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByText('Kuhedu English')).toBeInTheDocument()
    expect(screen.getByText('Speak English. Live it.')).toBeInTheDocument()
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
    // Tamil is not in the language list, so its button falls back to the code.
    expect(screen.getByRole('button', { name: 'ta' })).toBeInTheDocument()
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
    // A single headline needs no language buttons.
    expect(screen.queryByRole('group', { name: 'Headline language' })).not.toBeInTheDocument()

    act(() => settingsRepository.remove(LANDING_CONFIG_NAME))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(bengali.text)
  })

  it('still shows a headline saved in the earlier single-headline format', () => {
    settingsRepository.write(LANDING_CONFIG_NAME, {
      overlay: { headline: 'Old format headline', headlineLang: 'en' },
    })
    renderLandingPage()
    expect(screen.getByRole('heading', { name: 'Old format headline' })).toBeInTheDocument()
  })
})
