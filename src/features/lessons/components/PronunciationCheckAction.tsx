import { Ear } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { FitText } from '@/shared/ui/FitText'

export type PronunciationCheckActionProps = {
  /** The recording has been sent and the answer has not come. */
  checking: boolean
  onCheck: () => void
}

/**
 * The way to have a recording checked, and what that means said right beside it: checking sends
 * the learner's voice to our server, so it happens on a tap and never by itself.
 */
export function PronunciationCheckAction({ checking, onCheck }: PronunciationCheckActionProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" fullWidth disabled={checking} onClick={onCheck}>
        <Ear aria-hidden="true" className="size-5" />
        {t(checking ? 'lessonDay.feedback.checking' : 'lessonDay.feedback.check')}
      </Button>
      {/* One line under its button, in every language and on a narrow phone: drawn a little
          smaller where it has to be, never broken after its last words. */}
      <FitText className="text-center text-sm text-fg-muted">
        {t('lessonDay.feedback.sends')}
      </FitText>
    </div>
  )
}
