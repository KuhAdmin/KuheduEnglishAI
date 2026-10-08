import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export type BottomNavProps = Omit<ComponentProps<'nav'>, 'aria-label'> & {
  /** Accessible name of the navigation, e.g. "Main navigation". */
  label: string
}

/**
 * The app's main destinations, along the bottom edge where a thumb reaches them: at most five
 * `BottomNavItem`s. It keeps clear of the home indicator; where it sits (sticky, fixed) is the
 * layout's call.
 */
export function BottomNav({ label, className, children, ...rest }: BottomNavProps) {
  return (
    <nav
      aria-label={label}
      className={cn('border-t border-border bg-surface pb-safe', className)}
      {...rest}
    >
      <ul className="flex px-safe">{children}</ul>
    </nav>
  )
}
