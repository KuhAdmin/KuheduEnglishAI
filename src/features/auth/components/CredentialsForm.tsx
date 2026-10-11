import { ArrowRight, Lock, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { PasswordField } from '@/shared/ui/PasswordField'
import { TextField } from '@/shared/ui/TextField'
import type { CredentialsFormState } from '../hooks/useCredentialsForm'
import { useFieldError } from '../hooks/useFieldError'
import type { AuthMode } from '../types'
import { AuthFeedbackMessage } from './AuthFeedbackMessage'

export type CredentialsFormProps = {
  mode: AuthMode
  form: CredentialsFormState
}

/** Email and password, with the action for the current half of the account screen. */
export function CredentialsForm({ mode, form }: CredentialsFormProps) {
  const t = useT()
  const errorText = useFieldError()
  const { register, errors, feedback, submit, busy, clearFeedback } = form
  const signingUp = mode === 'signUp'

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label={t('auth.email')}
        type="email"
        inputMode="email"
        autoComplete={signingUp ? 'email' : 'username'}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        startAdornment={<Mail className="size-5" />}
        hint={signingUp ? t('auth.codeHint') : undefined}
        error={errorText(errors.email)}
        {...register('email', { onChange: clearFeedback })}
      />
      <div className="flex flex-col items-end">
        <PasswordField
          label={t('auth.password')}
          autoComplete={signingUp ? 'new-password' : 'current-password'}
          enterKeyHint="go"
          startAdornment={<Lock className="size-5" />}
          showLabel={t('auth.showPassword')}
          hideLabel={t('auth.hidePassword')}
          error={errorText(errors.password)}
          className="w-full"
          {...register('password', { onChange: clearFeedback })}
        />
        {!signingUp && (
          <Link
            to={paths.forgotPassword}
            className="inline-flex touch-target items-center px-1 font-bold text-primary underline underline-offset-4 active:opacity-70"
          >
            {t('auth.forgotPassword')}
          </Link>
        )}
      </div>

      <AuthFeedbackMessage feedback={feedback} />

      {/* Not `disabled`, which would take the focus away from whoever just pressed it. */}
      <Button type="submit" size="lg" fullWidth aria-disabled={busy || undefined}>
        {t(signingUp ? 'auth.signUpSubmit' : 'auth.signInSubmit')}
        <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </Button>
    </form>
  )
}
