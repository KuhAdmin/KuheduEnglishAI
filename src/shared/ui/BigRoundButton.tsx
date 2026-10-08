import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export type BigRoundButtonProps = ComponentProps<'button'> & {
  /** Sound is being played or recorded right now. */
  pulsing?: boolean
}

/** The one large control of an audio step: play what is to be heard, or record an answer. */
export function BigRoundButton({
  pulsing = false,
  className,
  type,
  children,
  ...rest
}: BigRoundButtonProps) {
  return (
    <span className="relative inline-flex">
      {pulsing && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse-ring rounded-full bg-primary motion-reduce:hidden"
        />
      )}
      <button
        type={type ?? 'button'}
        className={cn(
          'relative flex size-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-md select-none',
          'transition-[transform,background-color] duration-(--duration-fast) ease-standard',
          'active:scale-95 active:bg-primary-pressed',
          'disabled:pointer-events-none disabled:opacity-50',
          // Without motion, a still ring says the same thing as the pulse.
          pulsing && 'motion-reduce:ring-4 motion-reduce:ring-primary-soft',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    </span>
  )
}
