import type { ReactNode } from 'react'

export type OnboardingStepProps = {
  title: string
  subtitle?: string
  /** The step's question (choices, inputs); scrolls if it does not fit. */
  children: ReactNode
  /** Primary action, pinned in the thumb zone. */
  footer: ReactNode
}

/**
 * Frame shared by every onboarding step: heading, scrollable content and a pinned action.
 * Full-bleed route (not under ScreenLayout), so it manages its own safe areas.
 */
export function OnboardingStep({ title, subtitle, children, footer }: OnboardingStepProps) {
  return (
    <div className="flex h-dvh flex-col pt-safe">
      <main className="flex-1 overflow-y-auto scroll-contained px-gutter pb-4">
        <header className="flex flex-col gap-2 pt-8 pb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-balance">{title}</h1>
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
