import { useId, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type ChoiceChipsOption<Value extends string> = {
  value: Value
  label: ReactNode
  /** Optional second line under the label. */
  description?: ReactNode
  /** Language of the label, when it differs from the surrounding text. */
  lang?: string
  /** Shown after the label, outside its language (e.g. a tick with a hidden "Done"). */
  mark?: ReactNode
}

export type ChoiceChipsProps<Value extends string> = {
  /** Names the group, and is shown above it. */
  legend: string
  options: readonly ChoiceChipsOption<Value>[]
  value: Value
  onChange: (value: Value) => void
  /**
   * `wrap`: each chip as wide as its text, on as many lines as it takes. `equal`: one row
   * shared equally, label over description, for a few choices of the same kind.
   */
  layout?: 'wrap' | 'equal'
  className?: string
}

/**
 * A few short, mutually exclusive choices under their own heading (a radio group), where the
 * cards of `ChoiceList` would be too much: settings picked before a step rather than the step's
 * one question.
 */
export function ChoiceChips<Value extends string>({
  legend,
  options,
  value,
  onChange,
  layout = 'wrap',
  className,
}: ChoiceChipsProps<Value>) {
  const name = useId()
  const equal = layout === 'equal'

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="mb-2 font-extrabold">{legend}</legend>
      <div className={cn('flex gap-2', equal ? 'items-stretch' : 'flex-wrap')}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-11 min-w-0 cursor-pointer rounded-lg border-2 px-3 py-2',
                'transition-[transform,background-color,border-color] duration-(--duration-fast) ease-standard active:scale-97',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                equal ? 'flex-1 flex-col items-center gap-1 text-center' : 'items-center gap-2',
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
              {/* Selection is shown by a filled dot, not by color alone. */}
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                  selected ? 'border-primary' : 'border-border-strong',
                )}
              >
                <span className={cn('size-2 rounded-full bg-primary', !selected && 'invisible')} />
              </span>
              <span className={cn('flex min-w-0 flex-col', equal && 'items-center')}>
                <span lang={option.lang} className="font-bold wrap-break-word">
                  {option.label}
                </span>
                {option.description && (
                  <>
                    {/* Keeps the two lines apart in the accessible name. */}{' '}
                    <span className="text-sm wrap-break-word text-fg-muted">
                      {option.description}
                    </span>
                  </>
                )}
              </span>
              {option.mark && (
                <>
                  {/* Keeps the mark apart from the label in the accessible name. */} {option.mark}
                </>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
