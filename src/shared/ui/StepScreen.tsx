import type { ReactNode, Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type StepScreenProps = {
  title: string
  subtitle?: string
  /** Stays in view above the heading (e.g. a close button and progress). */
  topBar?: ReactNode
  /** The step's question (choices, inputs); scrolls if it does not fit. */
  children: ReactNode
  /** Primary action, pinned in the thumb zone. */
  footer: ReactNode
  /** Lets the caller move focus to the heading when the step changes in place. */
  headingRef?: Ref<HTMLHeadingElement>
}

/**
 * Frame for one step of a flow (onboarding, the placement test): heading, scrollable content
 * and a pinned action. For full-bleed routes (not under ScreenLayout), so it manages its own
 * safe areas.
 */
export function StepScreen({
  title,
  subtitle,
  topBar,
  children,
  footer,
  headingRef,
}: StepScreenProps) {
  return (
    <div className="flex h-dvh flex-col pt-safe">
      {topBar && <div className="pt-2 px-gutter">{topBar}</div>}
      <main className="flex-1 overflow-y-auto scroll-contained px-gutter pb-4">
        <header className={cn('flex flex-col gap-2 pb-6 text-center', topBar ? 'pt-4' : 'pt-8')}>
          <h1
            ref={headingRef}
            // Focusable by script only, so the new step is announced when focus moves to it.
            tabIndex={headingRef ? -1 : undefined}
            className="text-2xl font-extrabold tracking-tight text-balance outline-none"
          >
            {title}
          </h1>
          {subtitle && <p className="text-balance text-fg-muted">{subtitle}</p>}
        </header>
        {children}
      </main>
      <footer className="px-gutter pb-safe">
        <div className="pt-3 pb-4">{footer}</div>
      </footer>
    </div>
  )
}
