import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type AdminSectionProps = {
  title: ReactNode
  /** Guidance for the whole group, shown under the title. */
  description?: ReactNode
  /** Shown at the end of the title row (e.g. row actions). */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** A titled group of related fields. */
export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">{title}</h2>
          {actions}
        </div>
        {description && <p className="text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
