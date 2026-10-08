import { Check } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type ChoiceListOption<Value extends string> = {
  value: Value
  label: ReactNode
  /** Optional second line under the label. */
  description?: ReactNode
  /** Decorative leading visual (flag, icon, avatar). */
  media?: ReactNode
}

export type ChoiceListProps<Value extends string> = {
  /** Accessible name of the group (not shown; the screen's heading usually says the same). */
  legend: string
  options: readonly ChoiceListOption<Value>[]
  /** `null` when nothing is chosen yet. */
  value: Value | null
  onChange: (value: Value) => void
  /** The choice has been made and can no longer change; it stays readable. */
  disabled?: boolean
  className?: string
}

/** Single-choice list of large, tappable cards (a radio group). */
export function ChoiceList<Value extends string>({
  legend,
  options,
  value,
  onChange,
  disabled = false,
  className,
}: ChoiceListProps<Value>) {
  const name = useId()

  return (
    <fieldset disabled={disabled} className={cn('min-w-0', className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="flex flex-col gap-3">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-18 items-center gap-4 rounded-xl border-2 px-4 py-3',
                'transition-[transform,background-color,border-color] duration-(--duration-fast) ease-standard',
                !disabled && 'cursor-pointer active:scale-98',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                selected
                  ? 'border-primary bg-surface shadow-sm'
                  : 'border-transparent bg-surface-sunken',
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
              {option.media && (
                <span aria-hidden="true" className="shrink-0">
                  {option.media}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-lg font-bold">{option.label}</span>
                {option.description && (
                  <>
                    {/* Keeps the two lines apart in the accessible name ("Child (6–12)"). */}{' '}
                    <span className="text-fg-muted">{option.description}</span>
                  </>
                )}
              </span>
              {/* Selection is shown by a check mark, not by color alone. */}
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary',
                  !selected && 'invisible',
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
