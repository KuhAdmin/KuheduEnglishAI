import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { adminText } from '../adminText'

export type TextOverrideFieldProps = {
  label: ReactNode
  /** The language being edited (BCP-47). */
  language: string
  /** Text that ships with the app for this language, if there is one. */
  builtIn: string | undefined
  /** The admin's own text for this language; `undefined` when they have not changed it. */
  override: string | undefined
  /** What learners read while the language has no text of its own (the English wording). */
  fallback: string
  maxLength: number
  /** Shown under the field, before its status (e.g. the text's key, or the English wording). */
  note?: ReactNode
  /** What the reset button resets, for its accessible name. */
  resetName: string
  onChange: (text: string) => void
  onReset: () => void
}

/** One text in one language: what learners see now, editable, with its status and a reset. */
export function TextOverrideField({
  label,
  language,
  builtIn,
  override,
  fallback,
  maxLength,
  note,
  resetName,
  onChange,
  onReset,
}: TextOverrideFieldProps) {
  const edited = override !== undefined && override.trim() !== ''
  const status = edited
    ? adminText.wording.statusEdited
    : builtIn
      ? adminText.wording.statusBuiltIn
      : adminText.wording.statusMissing

  return (
    <div className="flex items-end gap-2">
      <TextAreaField
        className="flex-1"
        label={label}
        lang={language}
        value={override ?? builtIn ?? ''}
        // An emptied field falls back to this text, so show it.
        placeholder={builtIn ?? fallback}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        hint={
          <span lang="en" className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* The space keeps the two apart when the hint is read out as the field's description. */}
            {note}{' '}
            <span
              className={cn(
                'rounded-full px-2 text-xs font-bold',
                edited && 'bg-primary-soft text-on-primary-soft',
                !edited && builtIn && 'bg-surface-sunken text-fg-muted',
                !edited && !builtIn && 'bg-warning-soft text-fg',
              )}
            >
              {status}
            </span>
          </span>
        }
      />
      <IconButton
        label={`${adminText.wording.resetOne}: ${resetName}`}
        disabled={override === undefined}
        onClick={onReset}
        className="mb-7"
      >
        <RotateCcw aria-hidden="true" className="size-5" />
      </IconButton>
    </div>
  )
}
