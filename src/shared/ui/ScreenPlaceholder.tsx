import type { ReactNode } from 'react'

type ScreenPlaceholderProps = {
  title: string
  description: string
  children?: ReactNode
}

/**
 * Temporary stand-in for screens not designed yet.
 * TODO(ui-ux): delete once every screen is built from real design-system components.
 */
export function ScreenPlaceholder({ title, description, children }: ScreenPlaceholderProps) {
  return (
    <section className="flex flex-col gap-2 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="text-fg-muted">{description}</p>
      {children}
    </section>
  )
}
