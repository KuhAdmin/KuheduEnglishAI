import type { ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type StepScreenProps = {
  /** A short line above the heading saying where this step sits (e.g. "Week 20 of 50"). */
  eyebrow?: string
  title: string
  subtitle?: string
  /** `strong` when the subtitle is the point of the screen, not a remark on its heading. */
  subtitleTone?: 'muted' | 'strong'
  /** Stays in view above the heading (e.g. a close button and progress). */
  topBar?: ReactNode
  /**
   * The step's question (choices, inputs); scrolls if it does not fit. It is laid out in a
   * column as tall as the free space, so `flex-1` on a child fills it.
   */
  children: ReactNode
  /** Primary action, pinned in the thumb zone. */
  footer: ReactNode
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
  eyebrow,
  title,
  subtitle,
  subtitleTone = 'muted',
  topBar,
  children,
  footer,
  headingRef,
}: StepScreenProps) {
  return (
    <div className="flex h-dvh flex-col pt-safe">
      {topBar && <div className="pt-2 px-gutter">{topBar}</div>}
      <main className="flex flex-1 flex-col overflow-y-auto scroll-contained px-gutter pb-4">
        <header
          className={cn('flex shrink-0 flex-col gap-2 pb-6 text-center', topBar ? 'pt-4' : 'pt-8')}
        >
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
      </main>
      <footer className="px-gutter pb-safe">
        <div className="pt-3 pb-4">{footer}</div>
      </footer>
    </div>
  )
}
