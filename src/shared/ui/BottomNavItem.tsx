import { Slot } from '@radix-ui/react-slot'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export type BottomNavItemProps = ComponentProps<'a'> & {
  /** Style the child element (e.g. a router `NavLink`) instead of rendering an `<a>`. */
  asChild?: boolean
}

/**
 * One destination of a `BottomNav`: an icon above a label, both passed as children of the link.
 * The link marks itself as the current one with `aria-current="page"` (a router `NavLink` does
 * this), which is shown by a bar, a heavier label and color together.
 */
export function BottomNavItem({ asChild = false, className, ...rest }: BottomNavItemProps) {
  const Link = asChild ? Slot : 'a'
  return (
    <li className="flex min-w-0 flex-1">
      <Link
        className={cn(
          'relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2',
          'text-sm text-fg-muted select-none [&_svg]:size-6 [&_svg]:shrink-0',
          'transition-colors duration-(--duration-fast) ease-standard active:bg-surface-sunken',
          'aria-[current=page]:font-extrabold aria-[current=page]:text-primary',
          'before:absolute before:inset-x-5 before:top-0 before:h-1 before:rounded-full before:bg-primary before:opacity-0',
          'aria-[current=page]:before:opacity-100',
          className,
        )}
        {...rest}
      />
    </li>
  )
}
