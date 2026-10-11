import { KeyRound } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { TextField, type TextFieldProps } from '@/shared/ui/TextField'

export type CodeFieldProps = Omit<TextFieldProps, 'label' | 'type'>

/** The code from an email: a number pad, and the phone may offer the code straight from the mail. */
export function CodeField(props: CodeFieldProps) {
  const t = useT()

  return (
    <TextField
      label={t('auth.code')}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      startAdornment={<KeyRound className="size-5" />}
      {...props}
    />
  )
}
