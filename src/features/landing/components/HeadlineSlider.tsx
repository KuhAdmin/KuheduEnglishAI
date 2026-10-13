import { useEffect, useState } from 'react'
import type { LandingHeadline } from '@/shared/lib/appConfig/landingConfig'
import { cn } from '@/shared/lib/cn'
import { DEFAULT_LANGUAGE, primarySubtag } from '@/shared/lib/i18n'

/** How long each headline stays before the next one slides in. */
export const HEADLINE_INTERVAL_MS = 5000

export type HeadlineSliderProps = {
  headlines: readonly LandingHeadline[]
  /**
   * The language the visitor chose, if they have. Its headline is the one shown, and the
   * headlines stop taking turns. Left out or `null`: nothing is chosen yet, and they take turns.
   */
  language?: string | null
  className?: string
}

/**
 * Which headline a visitor who chose `language` is shown: the one written in it; else the
 * English one, which is what the rest of the app falls back to; else the first.
 */
function headlineIn(headlines: readonly LandingHeadline[], language: string): number {
  const written = (wanted: string) =>
    headlines.findIndex((headline) => primarySubtag(headline.lang) === primarySubtag(wanted))
  const own = written(language)
  return own >= 0 ? own : Math.max(written(DEFAULT_LANGUAGE), 0)
}

/**
 * The landing headline. Until the visitor has chosen a language it is said in each in turn:
 * every few seconds the current one slides out to the left and the next slides in from the
 * right, so every visitor soon sees their own. Choosing a language (the picker under it, on the
 * landing page) slides to that language's headline and ends the turns: text that changes by
 * itself must be stoppable, and that picker is what stops it.
 */
export function HeadlineSlider({ headlines, language, className }: HeadlineSliderProps) {
  const count = headlines.length
  const chosen = language ? headlineIn(headlines, language) : null
  const [position, setPosition] = useState<{ active: number; leaving: number | null }>({
    active: chosen ?? 0,
    leaving: null,
  })
  // The visitor chose, or chose again: slide from the headline on show to theirs.
  if (chosen !== null && chosen !== position.active) {
    setPosition({ active: chosen, leaving: position.active })
  }
  // An admin can shorten the list while the page is open.
  const active = position.active < count ? position.active : 0

  useEffect(() => {
    if (chosen !== null || count < 2) return
    const timer = setInterval(() => {
      // Do not rotate unseen in a background tab.
      if (document.hidden) return
      setPosition((current) => ({
        active: (current.active + 1) % count,
        leaving: current.active % count,
      }))
    }, HEADLINE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [chosen, count])

  return (
    // Every headline occupies the same grid cell, so the block is as tall as the longest one and
    // nothing below it moves when they change. The cell reaches the screen edges so a sliding
    // headline is clipped there, not at the page gutter.
    <div className={cn('-mx-(--gutter) grid overflow-x-clip px-gutter', className)}>
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
  )
}
