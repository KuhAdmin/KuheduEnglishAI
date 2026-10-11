import type { ReactNode } from 'react'
import { useLipSync } from '@/shared/lib/audio/useLipSync'
import { useT } from '@/shared/lib/i18n'
import { useTutorAvatar } from '@/shared/lib/learner/tutorAvatar'
import { TutorBar } from '@/shared/ui/TutorBar'
import { useTutorNarration } from './useTutorNarration'

export type TutorNarratorProps = {
  /** What the tutor has to say on this screen right now, in the language the screen is in. */
  line: string
  /** The line is praise: the tutor gives a thumbs up with it. */
  cheering?: boolean
  /** A control of the screen's own at the start of the tutor's first row (a back arrow). */
  leading?: ReactNode
  /** Where the bar sits on the screen (sticky, margins); nothing of its inside. */
  className?: string
}

/**
 * The learner's tutor on a screen: their chosen face, saying one line about what matters there
 * now, lips moving, and written out under it. The lines are stored texts, not generated, which
 * is why nothing here is called "AI" (`TODO(backend)`: a tutor that answers).
 *
 * The moving mouth is kept in here, so the screen around the tutor does not re-render with it.
 */
export function TutorNarrator({ line, cheering = false, leading, className }: TutorNarratorProps) {
  const t = useT()
  const avatar = useTutorAvatar()
  const mouth = useLipSync()
  const { canSay, speaking, muted, replay, toggleMuted } = useTutorNarration(line)

  return (
    <TutorBar
      className={className}
      label={t('tutorSays.label')}
      avatar={avatar}
      mouth={mouth}
      mood={speaking ? 'neutral' : cheering ? 'encourage' : 'smile'}
      text={line}
      leading={leading}
      replay={
        canSay
          ? { label: t(speaking ? 'tutorSays.stop' : 'tutorSays.replay'), onClick: replay }
          : undefined
      }
      sound={
        canSay
          ? {
              muted,
              label: t(muted ? 'tutorSays.unmute' : 'tutorSays.mute'),
              onToggle: toggleMuted,
            }
          : undefined
      }
    />
  )
}
