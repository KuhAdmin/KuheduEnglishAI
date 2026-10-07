import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

const iconButtonVariants = cva(
  [
    'inline-flex size-11 shrink-0 items-center justify-center rounded-full select-none',
    'transition-[transform,background-color] duration-(--duration-fast) ease-standard',
    'active:scale-95',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      variant: {
        ghost: 'bg-transparent text-fg-muted active:bg-surface-sunken',
        secondary: 'bg-primary-soft text-on-primary-soft active:bg-border',
        danger: 'bg-transparent text-danger active:bg-danger-soft',
      },
    },
    defaultVariants: { variant: 'ghost' },
  },
)

export type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> &
  VariantProps<typeof iconButtonVariants> & {
    /** What the button does — read by screen readers and shown as a tooltip. Required. */
    label: string
    /** Render the child element (e.g. a router `Link`) with this styling instead of a `<button>`. */
    asChild?: boolean
  }

/** Icon-only button with a 44px touch target. Pass the icon as children. */
export function IconButton({
  label,
  variant,
  asChild = false,
  className,
  type,
  children,
  ...rest
}: IconButtonProps) {
  const classes = cn(iconButtonVariants({ variant }), className)

  if (asChild) {
    return (
      <Slot aria-label={label} title={label} className={classes} {...rest}>
        {children}
      </Slot>
    )
  }

  return (
    <button type={type ?? 'button'} aria-label={label} title={label} className={classes} {...rest}>
      {children}
    </button>
  )
}
