import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useLandingConfig } from '@/shared/lib/appConfig/useLandingConfig'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { useLanguageStore, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { BrandLockup } from '@/shared/ui/BrandLockup'
import { Button } from '@/shared/ui/Button'
import { ChoiceChips } from '@/shared/ui/ChoiceChips'
import { HeadlineSlider } from '../components/HeadlineSlider'
import { LandingHero } from '../components/LandingHero'

export function LandingPage() {
  const { brand, hero, overlay, cta } = useLandingConfig()
  const { languages } = useLanguagesConfig()
  const t = useT()
  const haptic = useHaptics()
  // The language the visitor learns in: the one the whole app is shown in from here on, the
  // account screen and every step of onboarding included. `null` until they choose.
  const language = useLanguageStore((state) => state.language)
  const setLanguage = useLanguageStore((state) => state.setLanguage)
  // Each by its own name in its own script: the one a visitor can read is theirs.
  const languageChoices = useMemo(
    () => languages.map(({ code, nativeName }) => ({ value: code, label: nativeName, lang: code })),
    [languages],
  )

  return (
    <main className="relative isolate flex min-h-viewport flex-col">
      <LandingHero {...hero} className="-z-10" />

      <header className="pt-safe px-gutter">
        <BrandLockup {...brand} className="pt-4" />
      </header>

      {/*
        Actions sit in the thumb zone on a scrim that grows with the text, so the headline stays
        readable over any image at any length. Focus rings switch to the on-image color here.
      */}
      <div className="relative mt-auto bg-hero-scrim/95 px-gutter pb-safe [--color-focus:var(--color-on-hero)]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-full h-40 bg-linear-to-t from-hero-scrim/95 to-transparent"
        />
        <div className="flex animate-rise-in flex-col gap-6 pt-2 pb-6">
          <HeadlineSlider headlines={overlay.headlines} language={language} />

          {/* Nothing is ticked for a visitor who has not chosen: the app is in English till then. */}
          <ChoiceChips
            tone="hero"
            legend={t('landing.language')}
            options={languageChoices}
            value={language ?? ''}
            onChange={(code) => {
              haptic('tap')
              setLanguage(code)
            }}
          />

          <div className="flex flex-col gap-2">
            <Button asChild size="lg" fullWidth>
              <Link to={paths.signUp}>
                {cta.primaryLabel}
                <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
              </Link>
            </Button>
            <p className="flex flex-wrap items-center justify-center gap-x-1 text-on-hero-muted">
              {cta.signInPrompt}
              <Link
                to={paths.signIn}
                className="inline-flex touch-target items-center px-1 font-bold text-on-hero underline underline-offset-4 active:opacity-70"
              >
                {cta.signInLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
