import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { paths } from '@/shared/lib/paths'
import { credentialsSchemas, type Credentials } from '../lib/credentialsSchema'
import { verifyLocalAdmin } from '../lib/localAdmin'
import { useSessionStore } from '../store/useSessionStore'
import type { AuthFeedback, AuthMode } from '../types'

/**
 * The email + password form behind both halves of the account screen.
 *
 * TODO(auth): learner accounts do not exist yet (there is no backend). Until they do, signing
 * in only ever matches the local admin (lib/localAdmin), and signing up, Google and password
 * reset all answer "unavailable" rather than pretending an account was made.
 */
export function useCredentialsForm(mode: AuthMode) {
  const navigate = useNavigate()
  const haptic = useHaptics()
  const signInAsAdmin = useSessionStore((state) => state.signInAsAdmin)
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchemas[mode]),
    defaultValues: { email: '', password: '' },
  })

  const submit = handleSubmit(({ email, password }) => {
    if (mode === 'signUp') {
      setFeedback('unavailable')
      return
    }
    if (!verifyLocalAdmin(email, password)) {
      haptic('error')
      setFeedback('rejected')
      return
    }
    signInAsAdmin()
    navigate(paths.admin, { replace: true })
  })

  return {
    register,
    errors,
    feedback,
    submit,
    /** For actions that need accounts (Google, password reset). */
    showUnavailable: () => setFeedback('unavailable'),
    /** The message goes as soon as they start correcting. */
    clearFeedback: () => setFeedback(null),
    /** What was typed stays when the half changes; complaints about it do not. */
    clearMessages: () => {
      clearErrors()
      setFeedback(null)
    },
  }
}

export type CredentialsFormState = ReturnType<typeof useCredentialsForm>
