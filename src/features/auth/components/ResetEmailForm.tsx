import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordRequestSchema } from '@kuhedu/contracts'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useT } from '@/shared/lib/i18n'
import { TextField } from '@/shared/ui/TextField'
import { forgotPassword } from '../api/authApi'
import { useFieldError } from '../hooks/useFieldError'
import { readFailure } from '../lib/readFailure'
import type { AuthFeedback } from '../types'
import { AuthFeedbackMessage } from './AuthFeedbackMessage'

export type ResetEmailFormProps = {
  /** The form's id, so the screen's pinned button can submit it. */
  id: string
  /** The server has been asked to send a code to this address. */
  onSent: (email: string) => void
}

/** First step of a forgotten password: which address the code should go to. */
export function ResetEmailForm({ id, onSent }: ResetEmailFormProps) {
  const t = useT()
  const errorText = useFieldError()
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    defaultValues: { email: '' },
  })

  const submit = handleSubmit(async ({ email }) => {
    setFeedback(null)
    try {
      await forgotPassword(email)
      onSent(email)
    } catch (error) {
      const failure = readFailure(error, ['email'] as const)
      if (failure.fields.email) setError('email', { message: failure.fields.email })
      setFeedback(failure.feedback)
    }
  })

  return (
    <form id={id} noValidate onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label={t('auth.email')}
        type="email"
        inputMode="email"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        startAdornment={<Mail className="size-5" />}
        error={errorText(errors.email)}
        {...register('email', { onChange: () => setFeedback(null) })}
      />
      <AuthFeedbackMessage feedback={feedback} />
    </form>
  )
}
