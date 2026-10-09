import { Slot, Slottable } from '@radix-ui/react-slot'
import { ChevronRight } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type ListItemProps = Omit<ComponentProps<'button'>, 'title'> & {
  /** Decorative icon in a circle before the text. */
  icon?: ReactNode
  title: ReactNode
  /** A second line under the title: what the row leads to, or its current value. */
  description?: ReactNode
  /**
   * Render the child element (e.g. an empty router `<Link to="…" />`) as the row instead of a
   * `<button>`; the icon, text and arrow are drawn inside it.
   */
  asChild?: boolean
}

/** One row of a menu: an icon, a title with an optional second line, and an arrow onward. */
export function ListItem({
  icon,
  title,
  description,
  asChild = false,
  className,
  type,
  children,
  ...rest
}: ListItemProps) {
  const Row = asChild ? Slot : 'button'

  return (
    <Row
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(
        'flex min-h-18 w-full items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-start',
        'transition-[transform,background-color] duration-(--duration-fast) ease-standard',
        'active:scale-98 active:bg-surface-sunken',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-lg font-bold">{title}</span>
        {description && (
          <>
            {/* Keeps the two lines apart in the accessible name ("Language বাংলা"). */}{' '}
            <span className="truncate text-fg-muted">{description}</span>
          </>
        )}
      </span>
      <Slottable>{children}</Slottable>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-subtle" />
    </Row>
  )
}
