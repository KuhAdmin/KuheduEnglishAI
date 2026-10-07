import { ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type CompactSelectOption = {
  value: string
  label: string
  /** Language of the label, when it differs from the surrounding text. */
  lang?: string
}

export type CompactSelectProps = Omit<ComponentProps<'select'>, 'children' | 'aria-label'> & {
  /** Accessible name. Not shown: the current choice is the visible text. */
  label: string
  options: readonly CompactSelectOption[]
  /** Decorative icon before the current choice. */
  icon?: ReactNode
}

/**
 * A small pill that opens the platform's own picker — for a choice that sits in a header or a
 * toolbar, where `SelectField` with its label and full width would be too heavy.
 */
export function CompactSelect({ label, options, icon, className, ...rest }: CompactSelectProps) {
  return (
    <div className={cn('relative inline-flex min-w-0', className)}>
      {icon && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 inset-s-0 flex w-10 items-center justify-center text-fg-muted"
        >
          {icon}
        </span>
      )}
      <select
        aria-label={label}
        className={cn(
          'min-h-11 max-w-full cursor-pointer appearance-none truncate rounded-full bg-surface-sunken pe-9 text-base font-bold text-fg',
          'transition-colors duration-(--duration-fast) ease-standard active:bg-border',
          'disabled:opacity-50',
          icon ? 'ps-10' : 'ps-4',
        )}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} lang={option.lang}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute inset-e-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  )
}
