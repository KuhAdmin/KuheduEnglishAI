import { cn } from '@/shared/lib/cn'
import type { AvatarPaint } from './avatarPaint'

export type AvatarThumbsUpProps = {
  shown: boolean
  paint: AvatarPaint
}

/** A drawn figure's hand, thumb up, rising into the corner of a 200 by 200 picture. */
export function AvatarThumbsUp({ shown, paint }: AvatarThumbsUpProps) {
  return (
    <g
      data-part="thumbs-up"
      data-shown={shown}
      className={cn(
        'transition-[translate,opacity] duration-(--duration-slow) ease-emphasized motion-reduce:transition-none',
        !shown && 'translate-y-6 opacity-0',
      )}
    >
      <rect x={144} y={176} width={44} height={30} rx={8} fill={paint.cloth} />
      <rect x={155} y={120} width={17} height={38} rx={8.5} fill={paint.skin} />
      <rect x={146} y={144} width={40} height={38} rx={12} fill={paint.skin} />
      {/* The fingers, folded: the lines between them. */}
      <path
        className="stroke-(--figure-skin-shade)"
        d="M167 155 H185 M167 163.5 H185 M167 172 H185"
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        className="stroke-(--figure-skin-light) opacity-70"
        d="M160 127 V146"
        fill="none"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </g>
  )
}
