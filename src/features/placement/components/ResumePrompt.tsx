import { ArrowRight, Hourglass } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'

export type ResumePromptProps = {
  /** Whether the learner came back to an unfinished test, or has just paused this one. */
  kind: 'returning' | 'paused'
  onContinue: () => void
  /** Throw the answers away and begin a new test. */
  onRestart: () => void
}

/** An unfinished test, offered back: carry on, or start again (asked twice — it clears answers). */
export function ResumePrompt({ kind, onContinue, onRestart }: ResumePromptProps) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)
  const returning = kind === 'returning'

  return (
    <StepScreen
      title={t(returning ? 'placementTest.resume.title' : 'placementTest.paused.title')}
      subtitle={t(returning ? 'placementTest.resume.body' : 'placementTest.paused.body')}
      footer={
        confirming ? (
          <div role="alert" className="flex flex-col gap-2">
            <p className="pb-1 text-center font-bold">{t('placementTest.restart.confirm')}</p>
            <Button size="lg" fullWidth onClick={() => setConfirming(false)}>
              {t('placementTest.restart.no')}
            </Button>
            <Button variant="ghost" fullWidth onClick={onRestart}>
              {t('placementTest.restart.yes')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={onContinue}>
              {t('placementTest.resume.continue')}
              <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
              {t('placementTest.resume.restart')}
            </Button>
            <Button asChild variant="ghost" fullWidth>
              <Link to={paths.home}>{t('placementTest.resume.later')}</Link>
            </Button>
          </div>
        )
      }
    >
      <div className="flex animate-rise-in justify-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-primary-soft text-on-primary-soft">
          <Hourglass aria-hidden="true" className="size-12" />
        </span>
      </div>
    </StepScreen>
  )
}
