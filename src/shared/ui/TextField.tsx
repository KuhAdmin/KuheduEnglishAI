import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { fieldControlClass, fieldErrorClass, fieldHintClass, fieldLabelClass } from './fieldStyles'

export type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: ReactNode
  /** Extra guidance shown under the field. */
  hint?: ReactNode
  /** Validation message; also marks the field invalid. */
  error?: ReactNode
  /** Decorative icon inside the field, before the text. Hidden from assistive technology. */
  startAdornment?: ReactNode
  /** Control inside the field, after the text (e.g. an `IconButton`). */
  endAdornment?: ReactNode
}

/** Single-line text input with its label, hint and error wired up for assistive technology. */
export function TextField({
  label,
  hint,
  error,
  startAdornment,
  endAdornment,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        {startAdornment && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 inset-s-0 flex w-12 items-center justify-center text-fg-muted"
          >
            {startAdornment}
          </span>
        )}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hint && hintId, error && errorId) || undefined}
          className={cn(
            fieldControlClass,
            'min-h-12',
            startAdornment && 'ps-12',
            endAdornment && 'pe-12',
          )}
          {...rest}
        />
        {endAdornment && (
          <span className="absolute inset-y-0 inset-e-0.5 flex items-center">{endAdornment}</span>
        )}
      </div>
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
