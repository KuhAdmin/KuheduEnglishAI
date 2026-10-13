import { useLipSync } from '@/shared/lib/audio/useLipSync'
import { useTutorAvatar } from '@/shared/lib/learner/tutorAvatar'
import { TutorAvatar } from '@/shared/ui/TutorAvatar'

export type TutorAsPartnerProps = {
  /** The partner's line is being said right now. */
  speaking: boolean
}

/**
 * The learner's tutor, playing the person they talk to: the face they chose, its lips moving
 * with the line. A partner's lines are said in that tutor's English voice, so this is the face
 * the voice belongs to: a woman's voice from a woman's face, a man's from a man's.
 *
 * The moving mouth is kept in here, so the conversation around it does not re-render with it.
 */
export function TutorAsPartner({ speaking }: TutorAsPartnerProps) {
  const avatar = useTutorAvatar()
  const mouth = useLipSync()

  return (
    <TutorAvatar avatar={avatar} size="md" mouth={mouth} mood={speaking ? 'neutral' : 'smile'} />
  )
}
