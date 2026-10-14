import { Ear } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import type { ReplyCheck as Checked } from '../hooks/useReplyChecks'
import { ReplyFeedback } from './ReplyFeedback'

export type ReplyCheckProps = {
  /** What checking this turn's reply has come to, once it was asked for. */
  check: Checked | undefined
  /** Send the reply to be checked. Given only while its recording is kept and can be sent. */
  onCheck?: () => void
  /** Who the learner was answering. */
  partnerName: string
}

/**
 * Under a reply the learner gave: the way to have it checked, and then what the check came to.
 * A check that could not be made leaves the button there to try again.
 *
 * The button is a small one at the end of its bubble, so that it reads as being about that
 * reply. **What the tap does is not said beside it**: every reply of a conversation has one, and
 * the same sentence under each would bury them. It is said once before the conversation starts
 * and once at its end (`lessonDay.reply.sends`; decided by the user on 2026-10-14).
 */
export function ReplyCheck({ check, onCheck, partnerName }: ReplyCheckProps) {
  const t = useT()
  const canAsk = onCheck !== undefined && check?.status !== 'done'
  const checking = check?.status === 'checking'
  if (!canAsk && !check) return null

  return (
    <div className="flex flex-col items-end gap-2 self-stretch">
      {canAsk && (
        <Button variant="outline" size="sm" disabled={checking} onClick={onCheck}>
          <Ear aria-hidden="true" className="size-5" />
          {t(checking ? 'lessonDay.reply.checking' : 'lessonDay.reply.check')}
        </Button>
      )}
      {check && !checking && (
        // As wide as the conversation, not as the reply's own column, which is set in from the
        // edge: what was found is read, and wants the room.
        <div className="-ms-8 self-stretch">
          <ReplyFeedback check={check} partnerName={partnerName} />
        </div>
      )}
    </div>
  )
}
