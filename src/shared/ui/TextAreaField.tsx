import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { fieldControlClass, fieldErrorClass, fieldHintClass, fieldLabelClass } from './fieldStyles'

export type TextAreaFieldProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: ReactNode
  /** Extra guidance shown under the field. */
  hint?: ReactNode
  /** Validation message; also marks the field invalid. */
  error?: ReactNode
}

/** Multi-line text input; same anatomy as TextField. */
export function TextAreaField({
  label,
  hint,
  error,
  className,
  rows = 2,
  ...rest
}: TextAreaFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={fieldLabelClass}>
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && hintId, error && errorId) || undefined}
        className={cn(fieldControlClass, 'resize-y py-3')}
        {...rest}
      />
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
