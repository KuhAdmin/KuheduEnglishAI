import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold select-none',
    'transition-[transform,background-color] duration-(--duration-fast) ease-standard',
    'active:scale-97',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary shadow-md active:bg-primary-pressed',
        secondary: 'bg-primary-soft text-on-primary-soft active:bg-border',
        outline: 'border border-border-strong bg-surface text-fg active:bg-surface-sunken',
        ghost: 'bg-transparent text-primary active:bg-primary-soft',
      },
      size: {
        md: 'min-h-11 px-5 text-base',
        lg: 'min-h-14 px-6 text-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', fullWidth: false },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a router `Link`) with button styling instead of a `<button>`. */
    asChild?: boolean
  }

export function Button({
  variant,
  size,
  fullWidth,
  asChild = false,
  className,
  type,
  ...rest
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, fullWidth }), className)

  if (asChild) return <Slot className={classes} {...rest} />

  return <button type={type ?? 'button'} className={classes} {...rest} />
}
