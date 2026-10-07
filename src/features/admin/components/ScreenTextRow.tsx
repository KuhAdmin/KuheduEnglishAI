import { RotateCcw } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { TranslationKey } from '@/shared/lib/i18n'
import { MAX_SCREEN_TEXT_LENGTH } from '@/shared/lib/i18n/screenTexts'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { adminText } from '../adminText'

export type ScreenTextRowProps = {
  textKey: TranslationKey
  /** The language being edited (BCP-47). */
  language: string
  /** English source text, shown as the field's label so the admin knows what to write. */
  english: string
  /** Text that ships with the app for this language, if there is one. */
  builtIn: string | undefined
  /** The admin's own text for this language; `undefined` when they have not changed it. */
  override: string | undefined
  onChange: (text: string) => void
  onReset: () => void
}

/** One screen text in one language: what learners see now, editable, with its status. */
export function ScreenTextRow({
  textKey,
  language,
  english,
  builtIn,
  override,
  onChange,
  onReset,
}: ScreenTextRowProps) {
  const edited = override !== undefined && override.trim() !== ''
  const status = edited
    ? adminText.texts.statusEdited
    : builtIn
      ? adminText.texts.statusBuiltIn
      : adminText.texts.statusMissing

  return (
    <div className="flex items-end gap-2">
      <TextAreaField
        className="flex-1"
        label={english}
        lang={language}
        value={override ?? builtIn ?? ''}
        // An emptied field falls back to this text, so show it.
        placeholder={builtIn ?? english}
        maxLength={MAX_SCREEN_TEXT_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        hint={
          <span lang="en" className="flex flex-wrap items-center gap-x-2">
            <code className="font-mono text-xs break-all">{textKey}</code>
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
        label={`${adminText.texts.resetOne}: ${english}`}
        disabled={override === undefined}
        onClick={onReset}
        className="mb-7"
      >
        <RotateCcw aria-hidden="true" className="size-5" />
      </IconButton>
    </div>
  )
}
