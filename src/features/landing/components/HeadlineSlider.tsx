import { useEffect, useState } from 'react'
import type { LandingHeadline } from '@/shared/lib/appConfig/landingConfig'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'

/** How long each headline stays before the next one slides in. */
export const HEADLINE_INTERVAL_MS = 5000

export type HeadlineSliderProps = {
  headlines: readonly LandingHeadline[]
  /** Display name for a language code (its own name, e.g. "বাংলা"); the code is shown if missing. */
  languageNames: Readonly<Record<string, string>>
  className?: string
}

/**
 * The landing headline, said in each language in turn: every few seconds the current one slides
 * out to the left and the next slides in from the right, so every visitor soon sees their own.
 * The language names underneath jump straight to a headline and stop the rotation — text that
 * changes by itself must be stoppable.
 */
export function HeadlineSlider({ headlines, languageNames, className }: HeadlineSliderProps) {
  const t = useT()
  const count = headlines.length
  const [position, setPosition] = useState<{ active: number; leaving: number | null }>({
    active: 0,
    leaving: null,
  })
  const [rotating, setRotating] = useState(true)
  // An admin can shorten the list while the page is open.
  const active = position.active < count ? position.active : 0

  useEffect(() => {
    if (!rotating || count < 2) return
    const timer = setInterval(() => {
      // Do not rotate unseen in a background tab.
      if (document.hidden) return
      setPosition((current) => ({
        active: (current.active + 1) % count,
        leaving: current.active % count,
      }))
    }, HEADLINE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [rotating, count])

  const handleSelect = (index: number) => {
    setRotating(false)
    if (index !== active) setPosition({ active: index, leaving: active })
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {/*
        Every headline occupies the same grid cell, so the block is as tall as the longest one
        and nothing below it moves when they change. The cell reaches the screen edges so a
        sliding headline is clipped there, not at the page gutter.
      */}
      <div className="-mx-(--gutter) grid overflow-x-clip px-gutter">
        {headlines.map((headline, index) => (
          <div
            key={index}
            lang={headline.lang}
            aria-hidden={index === active ? undefined : true}
            className={cn(
              'col-start-1 row-start-1 flex flex-col justify-end gap-2',
              index === active && position.leaving !== null && 'animate-slide-in-left',
              index !== active &&
                (index === position.leaving ? 'animate-slide-out-left' : 'invisible'),
            )}
          >
            <h1 className="text-3xl leading-snug font-extrabold text-balance text-on-hero">
              {headline.text}
            </h1>
            {headline.subtext && <p className="text-lg text-on-hero-muted">{headline.subtext}</p>}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div
          role="group"
          aria-label={t('landing.headlineLanguage')}
          className="flex flex-wrap gap-x-1"
        >
          {headlines.map((headline, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={index === active}
              onClick={() => handleSelect(index)}
              className={cn(
                'inline-flex touch-target items-center rounded-full px-3 text-sm font-bold',
                'transition-colors duration-(--duration-fast) ease-standard active:bg-on-hero/25',
                index === active ? 'bg-on-hero/15 text-on-hero' : 'text-on-hero-muted',
              )}
            >
              <span lang={headline.lang}>{languageNames[headline.lang] ?? headline.lang}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
