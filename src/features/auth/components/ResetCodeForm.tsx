import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordRequestSchema } from '@kuhedu/contracts'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useT } from '@/shared/lib/i18n'
import { PasswordField } from '@/shared/ui/PasswordField'
import { forgotPassword, resetPassword } from '../api/authApi'
import { useFieldError } from '../hooks/useFieldError'
import { readFailure } from '../lib/readFailure'
import type { AuthFeedback } from '../types'
import { AuthFeedbackMessage } from './AuthFeedbackMessage'
import { CodeField } from './CodeField'
import { CodeResend } from './CodeResend'

const codeAndPasswordSchema = resetPasswordRequestSchema.omit({ email: true })

export type ResetCodeFormProps = {
  /** The form's id, so the screen's pinned button can submit it. */
  id: string
  /** The address the code was sent to. */
  email: string
  /** The password has been changed. */
  onDone: () => void
}

/** Second step of a forgotten password: the emailed code, and the password to have from now on. */
export function ResetCodeForm({ id, email, onDone }: ResetCodeFormProps) {
  const t = useT()
  const errorText = useFieldError()
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  const [askedAgain, setAskedAgain] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ code: string; password: string }>({
    resolver: zodResolver(codeAndPasswordSchema),
    defaultValues: { code: '', password: '' },
  })

  const fail = (error: unknown) => {
    const failure = readFailure(error, ['code', 'password'] as const)
    for (const field of ['code', 'password'] as const) {
      const message = failure.fields[field]
      if (message) setError(field, { message })
    }
    setFeedback(failure.feedback)
  }

  const submit = handleSubmit(async (values) => {
    setFeedback(null)
    setAskedAgain(false)
    try {
      await resetPassword({ email, ...values })
      onDone()
    } catch (error) {
      fail(error)
    }
  })

  const sendAgain = async () => {
    setFeedback(null)
    setAskedAgain(false)
    try {
      await forgotPassword(email)
      setAskedAgain(true)
    } catch (error) {
      fail(error)
    }
  }

  return (
    <form id={id} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <CodeField
        error={errorText(errors.code)}
        {...register('code', { onChange: () => setFeedback(null) })}
      />
      <PasswordField
        label={t('auth.newPassword')}
        autoComplete="new-password"
        enterKeyHint="done"
        startAdornment={<Lock className="size-5" />}
        showLabel={t('auth.showPassword')}
        hideLabel={t('auth.hidePassword')}
        error={errorText(errors.password)}
        {...register('password', { onChange: () => setFeedback(null) })}
      />
      <AuthFeedbackMessage feedback={feedback} />
      {/* The server never says whether a code went out, so neither does this. */}
      <CodeResend
        onResend={() => void sendAgain()}
        message={askedAgain ? t('auth.reset.resent') : null}
      />
    </form>
  )
}
