import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { fieldControlClass, fieldErrorClass, fieldHintClass, fieldLabelClass } from './fieldStyles'

export type SelectFieldOption = { value: string; label: string }

export type SelectFieldProps = Omit<ComponentProps<'select'>, 'id' | 'children'> & {
  label: ReactNode
  options: readonly SelectFieldOption[]
  hint?: ReactNode
  error?: ReactNode
}

/** Native select (the platform picker is the best one on phones) with label, hint and error. */
export function SelectField({ label, options, hint, error, className, ...rest }: SelectFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && hintId, error && errorId) || undefined}
        className={cn(fieldControlClass, 'min-h-12')}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className={fieldHintClass}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={fieldErrorClass}>
          {error}
        </p>
      )}
    </div>
  )
}
