import type { TutorAvatarId } from '@/shared/lib/learner/tutorAvatar'
import type { AvatarProps } from './AvatarFrame'
import { FemaleAvatar } from './FemaleAvatar'
import { MaleAvatar } from './MaleAvatar'

const drawings = {
  male: MaleAvatar,
  female: FemaleAvatar,
} satisfies Record<TutorAvatarId, (props: AvatarProps) => React.JSX.Element>

export type TutorAvatarProps = AvatarProps & {
  /** Which face to draw: the learner's choice (`useTutorAvatar()`), or one being offered. */
  avatar: TutorAvatarId
}

/** The tutor's face: one of the drawn avatars, with everything they can do. */
export function TutorAvatar({ avatar, ...rest }: TutorAvatarProps) {
  const Drawing = drawings[avatar]
  return <Drawing {...rest} />
}
