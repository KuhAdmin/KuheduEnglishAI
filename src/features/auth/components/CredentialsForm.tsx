import { ArrowRight, Lock, Mail } from 'lucide-react'
import type { FieldError } from 'react-hook-form'
import { isTranslationKey, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { PasswordField } from '@/shared/ui/PasswordField'
import { TextField } from '@/shared/ui/TextField'
import type { CredentialsFormState } from '../hooks/useCredentialsForm'
import type { AuthMode } from '../types'

export type CredentialsFormProps = {
  mode: AuthMode
  form: CredentialsFormState
}

/** Email and password, with the action for the current half of the account screen. */
export function CredentialsForm({ mode, form }: CredentialsFormProps) {
  const t = useT()
  const { register, errors, feedback, submit, showUnavailable, clearFeedback } = form
  const signingUp = mode === 'signUp'

  // The schemas report problems as screen-text keys (see lib/credentialsSchema).
  const errorText = (error: FieldError | undefined) =>
    error?.message && isTranslationKey(error.message) ? t(error.message) : undefined

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {/* TODO(auth): add the "We'll send an OTP to verify your email" hint with email verification. */}
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
          <button
            type="button"
            onClick={showUnavailable}
            className="touch-target px-1 font-bold text-primary underline underline-offset-4 active:opacity-70"
          >
            {t('auth.forgotPassword')}
          </button>
        )}
      </div>

      {feedback === 'rejected' && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 font-bold text-danger">
          {t('auth.invalid')}
        </p>
      )}
      {feedback === 'unavailable' && (
        <p
          role="alert"
          className="rounded-md bg-primary-soft px-4 py-3 font-bold text-on-primary-soft"
        >
          {t('auth.unavailable')}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth>
        {t(signingUp ? 'auth.signUpSubmit' : 'auth.signInSubmit')}
        <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </Button>
    </form>
  )
}
