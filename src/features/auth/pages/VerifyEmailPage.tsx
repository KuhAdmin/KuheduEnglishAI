import { useId } from 'react'
import { Navigate, useLocation } from 'react-router'
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
 * **Matching the code is what makes the account**, so there is no way past this screen without
 * it. The way out is "Use a different email", for an address that was mistyped or cannot be
 * read: it signs the browser out and goes back to signing up. An address left unverified can be
 * signed up with again, by anyone, so nothing is lost by walking away.
 */
export function VerifyEmailPage() {
  const t = useT()
  const formId = useId()
  const errorText = useFieldError()
  const user = useSessionStore((state) => state.user)
  const { state } = useLocation()
  // A new account has onboarding ahead of it; anyone else goes on from where they left off,
  // which the app's front door knows.
  const next = isNewAccount(state) ? paths.onboarding : paths.landing
  const { register, errors, feedback, resent, submit, sendAgain, startOver } = useVerifyEmail(next)

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
          <Button variant="ghost" size="lg" fullWidth onClick={() => void startOver()}>
            {t('auth.verify.startOver')}
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
