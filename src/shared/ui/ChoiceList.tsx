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
  /**
   * A control of the option's own (a button to hear it), drawn in the card beside the choice.
   * Using it does not choose the option.
   */
  action?: ReactNode
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
        {options.map((option, index) => {
          const selected = option.value === value
          const inputId = `${name}-${index}`
          const cardClass = cn(
            // `relative` keeps the hidden radio inside its card, so it scrolls with the card;
            // otherwise focusing it can scroll something further out than the screen.
            'relative flex min-h-18 items-center rounded-xl border-2 px-4 py-3',
            'transition-[transform,background-color,border-color] duration-(--duration-fast) ease-standard',
            'has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus',
            selected
              ? 'border-primary bg-surface shadow-sm'
              : 'border-transparent bg-surface-sunken',
          )
          const choice = (
            <>
              <input
                id={inputId}
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
            </>
          )
          // Selection is shown by a check mark, not by color alone.
          const tickClass = cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary',
            !selected && 'invisible',
          )
          const tick = <Check className="size-4" strokeWidth={3} />

          if (option.action === undefined) {
            return (
              <label
                key={option.value}
                className={cn(cardClass, 'gap-4', !disabled && 'cursor-pointer active:scale-98')}
              >
                {choice}
                <span aria-hidden="true" className={tickClass}>
                  {tick}
                </span>
              </label>
            )
          }

          // A button may not sit inside a label, so here the card is a box around the two; the
          // tick is a label of its own, so tapping it still chooses.
          return (
            <div
              key={option.value}
              className={cn(cardClass, 'gap-3', !disabled && 'has-[label:active]:scale-98')}
            >
              <label
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-4 self-stretch',
                  !disabled && 'cursor-pointer',
                )}
              >
                {choice}
              </label>
              <span className="shrink-0">{option.action}</span>
              <label
                htmlFor={inputId}
                aria-hidden="true"
                className={cn('shrink-0', !disabled && 'cursor-pointer')}
              >
                <span className={tickClass}>{tick}</span>
              </label>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
