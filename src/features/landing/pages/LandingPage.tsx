import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useLandingConfig } from '@/shared/lib/appConfig/useLandingConfig'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { paths } from '@/shared/lib/paths'
import { BrandLockup } from '@/shared/ui/BrandLockup'
import { Button } from '@/shared/ui/Button'
import { HeadlineSlider } from '../components/HeadlineSlider'
import { LandingHero } from '../components/LandingHero'

export function LandingPage() {
  const { brand, hero, overlay, cta } = useLandingConfig()
  const { languages } = useLanguagesConfig()
  const languageNames = useMemo(
    () => Object.fromEntries(languages.map(({ code, nativeName }) => [code, nativeName])),
    [languages],
  )

  return (
    <main className="relative isolate flex min-h-dvh flex-col">
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
          <HeadlineSlider headlines={overlay.headlines} languageNames={languageNames} />

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
