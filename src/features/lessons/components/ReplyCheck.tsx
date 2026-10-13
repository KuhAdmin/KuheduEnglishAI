import type { ReplyCheck as Checked } from '../hooks/useReplyChecks'
import { PronunciationCheckAction } from './PronunciationCheckAction'
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
 * Under a reply the learner gave: the way to have it checked, for as long as its recording is
 * kept, and then what the check came to, which stays after the recording has gone. A check that
 * could not be made leaves the button there to try again.
 */
export function ReplyCheck({ check, onCheck, partnerName }: ReplyCheckProps) {
  const canAsk = onCheck !== undefined && check?.status !== 'done'
  if (!canAsk && !check) return null

  return (
    <div className="flex w-full flex-col gap-2 pt-1">
      {canAsk && (
        <PronunciationCheckAction
          checking={check?.status === 'checking'}
          onCheck={onCheck}
          label="lessonDay.reply.check"
          checkingLabel="lessonDay.reply.checking"
        />
      )}
      {check && <ReplyFeedback check={check} partnerName={partnerName} />}
    </div>
  )
}
