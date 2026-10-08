import type { TranslationKey } from '@/shared/lib/i18n'
import { MAX_SCREEN_TEXT_LENGTH } from '@/shared/lib/i18n/screenTexts'
import { TextOverrideField } from './TextOverrideField'

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

/** One screen text in one language, labelled by its English wording and its key. */
export function ScreenTextRow({ textKey, english, ...field }: ScreenTextRowProps) {
  return (
    <TextOverrideField
      {...field}
      label={english}
      fallback={english}
      maxLength={MAX_SCREEN_TEXT_LENGTH}
      note={<code className="font-mono text-xs break-all">{textKey}</code>}
      resetName={english}
    />
  )
}
