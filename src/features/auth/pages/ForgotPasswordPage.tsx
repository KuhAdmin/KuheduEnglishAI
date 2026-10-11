import { ArrowLeft } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { fillText, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { StepScreen } from '@/shared/ui/StepScreen'
import { ResetCodeForm } from '../components/ResetCodeForm'
import { ResetEmailForm } from '../components/ResetEmailForm'

type Stage = { name: 'email' } | { name: 'code'; email: string } | { name: 'done' }

/**
 * A forgotten password, in three steps on one screen: the address, then the emailed code with
 * the new password, then the way back to signing in. The second step is reached whether or not
 * the address has an account, and says so: the server never tells.
 */
export function ForgotPasswordPage() {
  const t = useT()
  const formId = useId()
  const [stage, setStage] = useState<Stage>({ name: 'email' })
  const heading = useRef<HTMLHeadingElement>(null)
  const firstStage = useRef(true)

  // The step changes in place, so focus goes to its heading for it to be announced.
  useEffect(() => {
    if (firstStage.current) firstStage.current = false
    else heading.current?.focus()
  }, [stage.name])

  const back = (
    <div className="flex">
      <IconButton asChild label={t('auth.back')} className="-ms-2">
        <Link to={paths.signIn}>
          <ArrowLeft aria-hidden="true" className="size-6" />
        </Link>
      </IconButton>
    </div>
  )

  if (stage.name === 'done') {
    return (
      <StepScreen
        headingRef={heading}
        title={t('auth.reset.doneTitle')}
        subtitle={t('auth.reset.doneSubtitle')}
        footer={
          <Button asChild size="lg" fullWidth>
            <Link to={paths.signIn} replace>
              {t('auth.signInSubmit')}
            </Link>
          </Button>
        }
      >
        {null}
      </StepScreen>
    )
  }

  const sent = stage.name === 'code'

  return (
    <StepScreen
      headingRef={heading}
      topBar={back}
      title={t(sent ? 'auth.reset.title' : 'auth.forgot.title')}
      subtitle={
        sent
          ? fillText(t('auth.reset.subtitle'), { email: stage.email })
          : t('auth.forgot.subtitle')
      }
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth>
          {t(sent ? 'auth.reset.submit' : 'auth.forgot.submit')}
        </Button>
      }
    >
      {sent ? (
        <ResetCodeForm id={formId} email={stage.email} onDone={() => setStage({ name: 'done' })} />
      ) : (
        <ResetEmailForm id={formId} onSent={(email) => setStage({ name: 'code', email })} />
      )}
    </StepScreen>
  )
}
