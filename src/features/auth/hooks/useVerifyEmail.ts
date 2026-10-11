import { zodResolver } from '@hookform/resolvers/zod'
import { verifyEmailRequestSchema } from '@kuhedu/contracts'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { ApiError } from '@/shared/lib/api/client'
import { resendVerificationCode, verifyEmail } from '../api/authApi'
import { readFailure } from '../lib/readFailure'
import type { AuthFeedback } from '../types'

/** What asking for a new code came to: sent, or asked for too soon after the last. */
export type ResendOutcome = 'sent' | 'wait'

/** The code step after signing up: enter the emailed code, or ask for another. */
export function useVerifyEmail(next: string) {
  const navigate = useNavigate()
  const [feedback, setFeedback] = useState<AuthFeedback | null>(null)
  const [resent, setResent] = useState<ResendOutcome | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ code: string }>({
    resolver: zodResolver(verifyEmailRequestSchema),
    defaultValues: { code: '' },
  })

  const submit = handleSubmit(async ({ code }) => {
    setFeedback(null)
    setResent(null)
    try {
      await verifyEmail(code)
      navigate(next, { replace: true })
    } catch (error) {
      const failure = readFailure(error, ['code'] as const)
      if (failure.fields.code) setError('code', { message: failure.fields.code })
      // No longer signed in is not "wrong password" here: there is nothing to check a code for.
      setFeedback(failure.feedback === 'rejected' ? 'failed' : failure.feedback)
    }
  })

  const sendAgain = async () => {
    setFeedback(null)
    setResent(null)
    try {
      await resendVerificationCode()
      setResent('sent')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'rate_limited') setResent('wait')
      else setFeedback('failed')
    }
  }

  return { register, errors, feedback, resent, submit, sendAgain }
}
