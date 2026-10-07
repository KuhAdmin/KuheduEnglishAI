import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from './IconButton'
import { TextField, type TextFieldProps } from './TextField'

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'endAdornment'> & {
  /** Name of the reveal button while the password is hidden, e.g. "Show password". */
  showLabel: string
  /** Name of the reveal button while the password is shown, e.g. "Hide password". */
  hideLabel: string
}

/** Password input with a button to reveal what was typed — typos are common on a phone keyboard. */
export function PasswordField({ showLabel, hideLabel, ...rest }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <TextField
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      endAdornment={
        <IconButton
          label={visible ? hideLabel : showLabel}
          onClick={() => setVisible((current) => !current)}
        >
          <Icon aria-hidden="true" className="size-5" />
        </IconButton>
      }
      {...rest}
    />
  )
}
