import { replyAssessmentSchema, type ReplyAssessment } from '@kuhedu/contracts'
import { apiRequest } from '@/shared/lib/api/client'

/** The turn of a role-play a recording answers. */
export type TurnAnswered = {
  /** What the partner said. */
  partner: string
  /** The reply the lesson suggests. */
  suggested: string
}

/**
 * Have the server check a recording of a reply in a role-play, sent as a WAV. Neither the
 * recording nor what was said is kept there; what comes back is what was heard, whether it
 * answers the partner, and a better way to say it where there is one.
 */
export function checkReply(
  wav: Blob,
  { partner, suggested }: TurnAnswered,
): Promise<ReplyAssessment> {
  const turn = new URLSearchParams({ partner, suggested })

  return apiRequest(`/conversation/replies?${turn}`, {
    method: 'POST',
    schema: replyAssessmentSchema,
    blob: wav,
  })
}
