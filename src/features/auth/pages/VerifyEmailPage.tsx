import { useId } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useSessionStore } from '@/shared/lib/account'
import { fillText, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'
import { AuthFeedbackMessage } from '../components/AuthFeedbackMessage'
import { CodeField } from '../components/CodeField'
import { CodeResend } from '../components/CodeResend'
import { useFieldError } from '../hooks/useFieldError'
import { useVerifyEmail } from '../hooks/useVerifyEmail'
import { isNewAccount } from '../lib/newAccount'

/**
 * The code step: the address just given is sent a code, and this is where it is typed in.
 * Verifying can wait ("Do this later"): an account works without it.
 */
export function VerifyEmailPage() {
  const t = useT()
  const formId = useId()
  const errorText = useFieldError()
  const user = useSessionStore((state) => state.user)
  const { state } = useLocation()
  // A new account has onboarding ahead of it; anyone else came from their account.
  const next = isNewAccount(state) ? paths.onboarding : paths.home
  const { register, errors, feedback, resent, submit, sendAgain } = useVerifyEmail(next)

  if (!user) return <Navigate to={paths.signUp} replace />

  return (
    <StepScreen
      title={t('auth.verify.title')}
      subtitle={fillText(t('auth.verify.subtitle'), { email: user.email })}
      footer={
        <div className="flex flex-col gap-3">
          <Button type="submit" form={formId} size="lg" fullWidth>
            {t('auth.verify.submit')}
          </Button>
          <Button asChild variant="ghost" size="lg" fullWidth>
            <Link to={next} replace>
              {t('auth.verify.later')}
            </Link>
          </Button>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
        <CodeField error={errorText(errors.code)} {...register('code')} />
        <AuthFeedbackMessage feedback={feedback} />
        <CodeResend
          onResend={() => void sendAgain()}
          message={
            resent === 'sent' ? t('auth.resent') : resent === 'wait' ? t('auth.resendWait') : null
          }
        />
      </form>
    </StepScreen>
  )
}
