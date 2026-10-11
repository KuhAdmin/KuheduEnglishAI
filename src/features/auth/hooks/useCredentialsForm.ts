import { zodResolver } from '@hookform/resolvers/zod'
import type { SessionUser } from '@kuhedu/contracts'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { paths } from '@/shared/lib/paths'
import { signIn, signInWithGoogle, signUp } from '../api/authApi'
import { credentialsSchemas, type Credentials } from '../lib/credentialsSchema'
import { askGoogle, googleConfigured } from '../lib/googleSignIn'
import { NEW_ACCOUNT_STATE } from '../lib/newAccount'
import { readFailure } from '../lib/readFailure'
import type { AuthFeedback, AuthMode } from '../types'

// TODO(learner): once the profile is kept on the server, a learner who signs in on a new phone
// should land where their account says, not on a journey this phone knows nothing about.
const afterSignIn = (user: SessionUser) => (user.role === 'admin' ? paths.admin : paths.home)

/**
 * The email + password form behind both halves of the account screen, and Google beside it.
 * The server decides everything; this only says what it answered. "Continue as Guest" needs
 * none of it.
 */
export function useCredentialsForm(mode: AuthMode) {
  const navigate = useNavigate()
  const haptic = useHaptics()
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  // From the tap until it fails: the screen must not react to "signed in" while the next
  // screen is still on its way.
  const [entering, setEntering] = useState(false)

  const {
    register,
    handleSubmit,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({
    resolver: zodResolver(credentialsSchemas[mode]),
    defaultValues: { email: '', password: '' },
  })

  const fail = (error: unknown) => {
    const failure = readFailure(error, ['email', 'password'] as const)
    for (const field of ['email', 'password'] as const) {
      const message = failure.fields[field]
      if (message) setError(field, { message })
    }
    if (failure.feedback === 'rejected') haptic('error')
    setEntering(false)
    setFeedback(failure.feedback)
  }

  const submit = handleSubmit(async (credentials) => {
    if (entering) return
    setFeedback(null)
    setEntering(true)
    try {
      if (mode === 'signUp') {
        await signUp(credentials)
        // A code is on its way to the address; the next step asks for it.
        navigate(paths.verifyEmail, { state: NEW_ACCOUNT_STATE })
      } else {
        navigate(afterSignIn(await signIn(credentials)), { replace: true })
      }
    } catch (error) {
      fail(error)
    }
  })

  const continueWithGoogle = async () => {
    if (!googleConfigured) {
      setFeedback('unavailable')
      return
    }
    if (entering) return
    setFeedback(null)
    try {
      const credential = await askGoogle()
      // The visitor closed Google's prompt: nothing happened, and nothing needs saying.
      if (!credential) return
      setEntering(true)
      const user = await signInWithGoogle(credential)
      navigate(mode === 'signUp' ? paths.onboarding : afterSignIn(user), { replace: true })
    } catch (error) {
      fail(error)
    }
  }

  return {
    register,
    errors,
    feedback,
    submit,
    /** An attempt is with the server, or has just let the visitor in. */
    entering,
    busy: isSubmitting || entering,
    continueWithGoogle,
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
