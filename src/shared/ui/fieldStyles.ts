/** Classes shared by TextField, TextAreaField and SelectField so all form controls match. */

export const fieldLabelClass = 'text-sm font-bold text-fg'

export const fieldControlClass = [
  'w-full rounded-md border border-border-strong bg-surface px-4 text-base text-fg',
  'placeholder:text-fg-subtle',
  'transition-colors duration-(--duration-fast) ease-standard',
  'focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-focus',
  'aria-invalid:border-danger',
  'disabled:opacity-50',
].join(' ')

export const fieldHintClass = 'text-sm text-fg-muted'

export const fieldErrorClass = 'text-sm font-bold text-danger'
