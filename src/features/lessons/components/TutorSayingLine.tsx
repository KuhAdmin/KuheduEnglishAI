import { useLipSync } from '@/shared/lib/audio/useLipSync'
import type { TutorAvatarId } from '@/shared/lib/learner/tutorAvatar'
import { TutorAvatar } from '@/shared/ui/TutorAvatar'

export type TutorSayingLineProps = {
  avatar: TutorAvatarId
  size: 'sm' | 'md'
}

/**
 * The tutor's face while it says a line: its lips follow the sound. The moving mouth is kept in
 * here, so the conversation around it does not re-render with it. Drawn only while the line is
 * being said, it joins a sound that has already begun (`onSpeechActivity`).
 */
export function TutorSayingLine({ avatar, size }: TutorSayingLineProps) {
  const mouth = useLipSync()
  return <TutorAvatar avatar={avatar} size={size} mouth={mouth} mood="neutral" />
}
