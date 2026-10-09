import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type AvatarHeadProps = {
  /** The figure is saying something: its head moves a little, as a speaker's does. */
  speaking: boolean
  /** The parts of the drawing that are the head (and hair that hangs from it). */
  children: ReactNode
}

/**
 * The head of a drawn avatar, which moves slightly while the figure speaks: it sways from side
 * to side about the neck and lifts and dips a little. The two movements have different lengths,
 * so together they do not repeat for a long while and do not look like a loop.
 *
 * When the speaking stops the head stays where it is rather than snapping upright, and carries
 * on from there next time. Without motion it does not move at all.
 */
export function AvatarHead({ speaking, children }: AvatarHeadProps) {
  const playing = speaking ? '[animation-play-state:running]' : '[animation-play-state:paused]'

  return (
    <g
      data-part="head"
      data-speaking={speaking}
      // The pivot is the base of the neck: the middle of the picture, 70% of the way down.
      className={cn('origin-[50%_70%] animate-head-sway motion-reduce:animate-none', playing)}
    >
      <g className={cn('animate-head-nod motion-reduce:animate-none', playing)}>{children}</g>
    </g>
  )
}
