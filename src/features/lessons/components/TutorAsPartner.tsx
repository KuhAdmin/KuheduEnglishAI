import { useTutorAvatar } from '@/shared/lib/learner/tutorAvatar'
import { TutorAvatar } from '@/shared/ui/TutorAvatar'
import { TutorSayingLine } from './TutorSayingLine'

export type TutorAsPartnerProps = {
  /** The partner's line is being said right now. */
  speaking: boolean
  /** `md` where the face stands alone, `sm` beside a line of the conversation. */
  size?: 'sm' | 'md'
}

/**
 * The learner's tutor, playing the person they talk to: the face they chose, its lips moving
 * with the line. A partner's lines are said in that tutor's English voice, so this is the face
 * the voice belongs to: a woman's voice from a woman's face, a man's from a man's.
 *
 * A conversation has this face beside every one of the partner's lines, so only the one whose
 * line is being said follows the sound (`TutorSayingLine`); the others are still, and are not
 * drawn again with it.
 */
export function TutorAsPartner({ speaking, size = 'md' }: TutorAsPartnerProps) {
  const avatar = useTutorAvatar()

  return speaking ? (
    <TutorSayingLine avatar={avatar} size={size} />
  ) : (
    <TutorAvatar avatar={avatar} size={size} mood="smile" />
  )
}
