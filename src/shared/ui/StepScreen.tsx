import type { ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type StepScreenProps = {
  /** A picture above the heading (a medal, a scene). Decorative: the heading names the step. */
  media?: ReactNode
  /** A short line above the heading saying where this step sits (e.g. "Week 20 of 50"). */
  eyebrow?: string
  title: string
  subtitle?: string
  /** `strong` when the subtitle is the point of the screen, not a remark on its heading. */
  subtitleTone?: 'muted' | 'strong'
  /** Stays in view above the heading (e.g. a close button and progress). */
  topBar?: ReactNode
  /**
   * `soft` draws the top bar as a band in the theme's soft primary colour, from edge to edge and
   * over the notch, so the part that stays is told apart from what scrolls under it. Controls
   * in it then want the variants drawn for that colour (`IconButton` `secondary`).
   */
  topBarTone?: 'plain' | 'soft'
  /**
   * The step's question (choices, inputs); scrolls if it does not fit. It is laid out in a
   * column as tall as the free space, so `flex-1` on a child fills it.
   */
  children: ReactNode
  /** Primary action, pinned in the thumb zone. Left out on a screen that saves as it is used. */
  footer?: ReactNode
  /** Lets the caller move focus to the heading when the step changes in place. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * Frame for one step of a flow (onboarding, the placement test, a week's overview): heading,
 * scrollable content
 * and a pinned action. For full-bleed routes (not under ScreenLayout), so it manages its own
 * safe areas.
 */
export function StepScreen({
  media,
  eyebrow,
  title,
  subtitle,
  subtitleTone = 'muted',
  topBar,
  topBarTone = 'plain',
  children,
  footer,
  headingRef,
}: StepScreenProps) {
  const hasFooter = footer !== undefined
  const band = topBar !== undefined && topBarTone === 'soft'

  return (
    // A band keeps clear of the notch itself, so that its colour reaches the screen's top edge.
    <div className={cn('flex h-viewport flex-col', !band && 'pt-safe')}>
      {topBar && (
        <div
          className={cn(
            // Above the content, or its shadow would be painted under it.
            band &&
              'relative z-(--z-sticky) bg-primary-soft pt-safe text-on-primary-soft shadow-sm',
          )}
        >
          {/* A band leaves the space above and below to what is in it, so that a tutor in it
              sits exactly where the tutor sits on other screens. */}
          <div className={cn('px-gutter', !band && 'pt-2')}>{topBar}</div>
        </div>
      )}
      {/* `relative`: anything `absolute` inside (a visually hidden label) scrolls with the content. */}
      <main className="relative flex flex-1 flex-col overflow-y-auto scroll-contained px-gutter pb-4">
        <header
          className={cn('flex shrink-0 flex-col gap-2 pb-6 text-center', topBar ? 'pt-4' : 'pt-8')}
        >
          {media && (
            <div aria-hidden="true" className="flex justify-center">
              {media}
            </div>
          )}
          {eyebrow && <p className="text-sm font-extrabold text-primary">{eyebrow}</p>}
          <h1
            ref={headingRef}
            // Focusable by script only, so the new step is announced when focus moves to it.
            tabIndex={headingRef ? -1 : undefined}
            className="text-2xl font-extrabold tracking-tight text-balance outline-none"
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                'text-balance',
                subtitleTone === 'strong' ? 'text-lg font-extrabold text-fg' : 'text-fg-muted',
              )}
            >
              {subtitle}
            </p>
          )}
        </header>
        {/* Fills what is left under the heading, so a step can centre its content there. */}
        <div className="flex flex-1 flex-col">{children}</div>
        {/* With no footer under it, the content itself keeps clear of the home indicator. */}
        {!hasFooter && <div className="shrink-0 pb-safe" />}
      </main>
      {hasFooter && (
        <footer className="px-gutter pb-safe">
          <div className="pt-3 pb-4">{footer}</div>
        </footer>
      )}
    </div>
  )
}
