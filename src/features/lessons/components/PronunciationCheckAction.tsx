import { Ear } from 'lucide-react'
import { useT, type TranslationKey } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'

export type PronunciationCheckActionProps = {
  /** The recording has been sent and the answer has not come. */
  checking: boolean
  onCheck: () => void
  /** What the button is called, and while checking: how a word was said, unless told otherwise. */
  label?: TranslationKey
  checkingLabel?: TranslationKey
}

/**
 * The way to have a recording checked, and what that means said right beside it: checking sends
 * the learner's voice to our server, so it happens on a tap and never by itself.
 */
export function PronunciationCheckAction({
  checking,
  onCheck,
  label = 'lessonDay.feedback.check',
  checkingLabel = 'lessonDay.feedback.checking',
}: PronunciationCheckActionProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" fullWidth disabled={checking} onClick={onCheck}>
        <Ear aria-hidden="true" className="size-5" />
        {t(checking ? checkingLabel : label)}
      </Button>
      <p className="text-center text-sm text-fg-muted">{t('lessonDay.feedback.sends')}</p>
    </div>
  )
}
