import { ArrowRight } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'

export type QuestionFooterProps = {
  /** The learner has given an answer to go on with. */
  canContinue: boolean
  onContinue: () => void
  helpOpened: boolean
  onOpenHelp: () => void
}

/** The two ways on from any question: with an answer, or by saying "I'm not sure". */
export function QuestionFooter({
  canContinue,
  onContinue,
  helpOpened,
  onOpenHelp,
}: QuestionFooterProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" fullWidth disabled={!canContinue} onClick={onContinue}>
        {t('onboarding.continue')}
        <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
      </Button>
      <Button
        variant="ghost"
        fullWidth
        aria-expanded={helpOpened}
        disabled={helpOpened}
        onClick={onOpenHelp}
      >
        {t('placementTest.notSure')}
      </Button>
    </div>
  )
}
