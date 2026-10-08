import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type LabelledActionProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Shown in a round chip above the label. Decorative: the label names the button. */
  icon: ReactNode
  label: string
}

/** A secondary action beside the microphone: a round icon with its name written underneath. */
export function LabelledAction({ icon, label, className, type, ...rest }: LabelledActionProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(
        'flex w-20 flex-col items-center gap-1 text-center text-sm font-bold text-fg-muted select-none',
        'transition-transform duration-(--duration-fast) ease-standard active:scale-95',
        'disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-fg">
        {icon}
      </span>
      {/* Room for two lines whatever the language, so a row of these keeps its icons level. */}
      <span className="flex min-h-10 items-start text-balance wrap-break-word">{label}</span>
    </button>
  )
}
