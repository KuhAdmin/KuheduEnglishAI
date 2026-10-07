import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/cn'

export type ProgressBarProps = Omit<ComponentProps<'div'>, 'children' | 'role'> & {
  /** How far along, from 0 to 1. Values outside that range are clamped. */
  value: number
  /** Accessible name: what is progressing. */
  label: string
}

/** A thin bar showing how much of something is done. */
export function ProgressBar({ value, label, className, ...rest }: ProgressBarProps) {
  const fraction = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fraction * 100)}
      className={cn('h-2 overflow-hidden rounded-full bg-border-strong', className)}
      {...rest}
    >
      <div
        className={cn(
          'h-full rounded-full bg-primary transition-transform duration-(--duration-base) ease-standard',
          // Parked just outside the track, an empty bar can still leak a sliver at its edge.
          fraction === 0 && 'invisible',
        )}
        // Moved rather than resized, so only `transform` animates.
        style={{ transform: `translateX(${(fraction - 1) * 100}%)` }}
      />
    </div>
  )
}
