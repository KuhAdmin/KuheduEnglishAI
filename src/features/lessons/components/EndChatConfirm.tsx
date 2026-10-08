import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'

export type EndChatConfirmProps = {
  /** Where leaving leads: the week's overview. */
  backTo: string
  /** What leaving costs, when it is not "the day will not be finished". */
  note?: string
  onStay: () => void
}

/**
 * Asks before a conversation is left half-way, in place of its controls: where the thumb
 * already is, and without a pop-up. Staying is the main action, so a slip of the thumb costs
 * nothing.
 */
export function EndChatConfirm({ backTo, note, onStay }: EndChatConfirmProps) {
  const t = useT()
  const titleId = useId()
  const stay = useRef<HTMLButtonElement>(null)

  // The question replaces the button that asked it; put focus on its safe answer.
  useEffect(() => stay.current?.focus(), [])

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-center">
        <h2 id={titleId} className="text-lg font-extrabold">
          {t('lessonDay.talk.endTitle')}
        </h2>
        <p className="text-fg-muted">{note ?? t('lessonDay.talk.endBody')}</p>
      </div>
      <Button ref={stay} size="lg" fullWidth onClick={onStay}>
        {t('lessonDay.talk.endCancel')}
      </Button>
      <Button asChild variant="outline" size="lg" fullWidth>
        <Link to={backTo}>{t('lessonDay.talk.end')}</Link>
      </Button>
    </section>
  )
}
