import { zodResolver } from '@hookform/resolvers/zod'
import type { SessionUser } from '@kuhedu/contracts'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { paths } from '@/shared/lib/paths'
import { signIn, signUp } from '../api/authApi'
import { credentialsSchemas, type Credentials } from '../lib/credentialsSchema'
import {
  GOOGLE_FAILED,
  GOOGLE_OUTCOME_PARAM,
  googleConfigured,
  goToGoogle,
} from '../lib/googleSignIn'
import { NEW_ACCOUNT_STATE } from '../lib/newAccount'
import { readFailure } from '../lib/readFailure'
import type { AuthFeedback, AuthMode } from '../types'

// A learner goes to the app's front door, which sends them on from where they left off in this
// browser, or into onboarding if nothing of theirs is here (`openWhereTheyLeftOff`, in app/).
// TODO(learner): once the profile is kept on the server, they land where their account says.
// Someone who signed up and never entered their code has no account yet: the code step, where
// the server has just sent them a new one.
function afterSignIn(user: SessionUser) {
  if (user.role === 'admin') return paths.admin
  return user.emailVerified ? paths.landing : paths.verifyEmail
}

/**
 * The email + password form behind both halves of the account screen, and Google beside it.
 * The server decides everything; this only says what it answered.
 */
export function useCredentialsForm(mode: AuthMode) {
  const navigate = useNavigate()
  const haptic = useHaptics()
  const [searchParams] = useSearchParams()
  // Back from Google's page without having been signed in: the server says so in the address.
  const [feedback, setFeedback] = useState<AuthFeedback | null>(() =>
    searchParams.get(GOOGLE_OUTCOME_PARAM) === GOOGLE_FAILED ? 'googleFailed' : null,
  )
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

  const continueWithGoogle = () => {
    if (!googleConfigured) {
      setFeedback('unavailable')
      return
    }
    if (entering) return
    // The browser leaves for Google's page and comes back by the app's front door. Nothing is
    // marked as under way: a visitor who comes back with the Back button finds the screen as
    // they left it.
    goToGoogle()
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
