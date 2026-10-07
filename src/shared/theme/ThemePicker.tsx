import { Check } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import type { ThemeId, ThemePreference } from './themes'

export type ThemePickerOption = {
  value: ThemePreference
  label: string
  /** Optional second line, e.g. "Matches your phone". */
  hint?: string
  /** Themes shown in the preview; two for a split preview (used by "Auto"). */
  preview: readonly ThemeId[]
}

export type ThemePickerProps = {
  /** Accessible name of the group. */
  legend: string
  options: readonly ThemePickerOption[]
  value: ThemePreference
  onChange: (value: ThemePreference) => void
  className?: string
}

/** Miniature screen rendered in the given theme's real tokens. */
function ThemePreview({ themeId }: { themeId: ThemeId }) {
  return (
    <span data-theme={themeId} className="flex flex-1 flex-col justify-between gap-2 bg-bg p-2">
      <span className="flex flex-col gap-1 rounded-sm bg-surface p-1.5 shadow-sm">
        <span className="h-1.5 w-3/4 rounded-full bg-fg" />
        <span className="h-1.5 w-1/2 rounded-full bg-fg-subtle" />
      </span>
      <span className="flex items-center gap-1">
        <span className="h-3 flex-1 rounded-full bg-primary" />
        <span className="size-3 rounded-full bg-accent" />
      </span>
    </span>
  )
}

export function ThemePicker({ legend, options, value, onChange, className }: ThemePickerProps) {
  const name = useId()

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex cursor-pointer flex-col gap-2 rounded-lg border-2 bg-surface p-2',
                'transition-transform duration-(--duration-fast) ease-standard active:scale-97',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
                selected ? 'border-primary' : 'border-border',
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
              <span
                aria-hidden="true"
                className="flex h-20 overflow-hidden rounded-md border border-border"
              >
                {option.preview.map((themeId) => (
                  <ThemePreview key={themeId} themeId={themeId} />
                ))}
              </span>
              <span className="flex min-h-10 flex-col justify-center px-1">
                <span className="font-bold">{option.label}</span>
                {option.hint && <span className="text-sm text-fg-muted">{option.hint}</span>}
              </span>
              {/* Selection is shown by a check mark, not by border color alone. */}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 right-0 flex size-7 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-primary text-on-primary shadow-md"
                >
                  <Check className="size-4" strokeWidth={3} />
                </span>
              )}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
