import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type SegmentedControlOption<Value extends string> = {
  value: Value
  label: ReactNode
  /** Language of the label, when it differs from the surrounding text. */
  lang?: string
}

export type SegmentedControlProps<Value extends string> = {
  /** Accessible name of the group. */
  legend: string
  options: readonly SegmentedControlOption<Value>[]
  value: Value
  onChange: (value: Value) => void
  /** Share the full width equally between the choices, instead of sizing each to its label. */
  fullWidth?: boolean
  className?: string
}

/** A row of mutually exclusive choices (a radio group). Scrolls sideways when it does not fit. */
export function SegmentedControl<Value extends string>({
  legend,
  options,
  value,
  onChange,
  fullWidth = false,
  className,
}: SegmentedControlProps<Value>) {
  const name = useId()

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex gap-1 overflow-x-auto scroll-contained rounded-full bg-surface-sunken p-1">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                // `relative` keeps the hidden radio inside its segment, so the scroller clips it;
                // otherwise a segment scrolled out of view would widen the whole page.
                'relative flex min-h-10 cursor-pointer items-center rounded-full px-4 font-bold whitespace-nowrap',
                'transition-colors duration-(--duration-fast) ease-standard',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-0 has-focus-visible:outline-focus',
                fullWidth ? 'flex-1 justify-center' : 'shrink-0',
                selected ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span lang={option.lang}>{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
