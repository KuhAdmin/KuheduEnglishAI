import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { AvatarDefs } from './AvatarDefs'
import { AvatarEye } from './AvatarEye'
import { AvatarFrame, type AvatarProps } from './AvatarFrame'
import { AvatarHead } from './AvatarHead'
import { AvatarMouth } from './AvatarMouth'
import { AvatarThumbsUp } from './AvatarThumbsUp'
import { avatarPaint } from './avatarPaint'

const head =
  'M59 84 C59 58 78 40 100 40 C122 40 141 58 141 84 C141 113 122 136 100 136 C78 136 59 113 59 84 Z'
const fringe =
  'M58 90 C50 50 74 28 102 28 C132 28 152 50 142 90 C140 77 133 65 120 57 C106 74 85 76 71 69 C69 75 67 82 63 90 Z'
const top = [
  '[stop-color:var(--figure-top-light)]',
  '[stop-color:var(--figure-top)]',
  '[stop-color:var(--figure-top-shade)]',
] as const

/**
 * A drawn woman, head and shoulders, the counterpart of `MaleAvatar` and shaded the same way:
 * she blinks, her lips take the shape given (`useLipSync()` moves them with the device's
 * voice), and her mood can be a wide smile or a thumbs up. A drawing, in its own colors
 * whatever the theme.
 */
export function FemaleAvatar({ mouth = 'rest', mood = 'neutral', ...rest }: AvatarProps) {
  const paint = avatarPaint(useId())
  const smiling = mood !== 'neutral'
  // While a text is said the mouth is never at rest, even between its words.
  const speaking = mouth !== 'rest'
  const face = `${paint.id}-face`

  return (
    <AvatarFrame mouth={mouth} mood={mood} {...rest}>
      <AvatarDefs paint={paint} cloth={top} />
      <circle cx={100} cy={94} r={94} fill={paint.glow} />

      {/* Long hair, falling behind the shoulders. It moves with the head it hangs from. */}
      <AvatarHead speaking={speaking}>
        <path
          d="M48 100 C38 44 70 20 100 20 C130 20 162 44 152 100 C154 130 164 152 158 180 L42 180 C36 152 46 130 48 100 Z"
          fill={paint.hair}
        />
      </AvatarHead>

      {/* Shoulders, in a top with a round neck. */}
      <path d="M26 200 C26 162 58 144 100 144 C142 144 174 162 174 200 Z" fill={paint.cloth} />
      <rect x={87} y={116} width={26} height={36} rx={11} fill={paint.neck} />
      <path className="fill-(--figure-skin-shade)" d="M77 145 Q100 175 123 145 Q100 151 77 145 Z" />
      <path
        className="stroke-(--figure-top-light)"
        d="M76 145 Q100 177 124 145"
        fill="none"
        strokeWidth={4}
        strokeLinecap="round"
      />

      <AvatarHead speaking={speaking}>
        {/* Head: face, the shadow her hair throws on it, then the hair swept across the forehead. */}
        <clipPath id={face}>
          <path d={head} />
        </clipPath>
        <path d={head} fill={paint.skin} />
        <g clipPath={`url(#${face})`}>
          <path
            className="fill-(--figure-skin-deep) opacity-45"
            d={fringe}
            transform="translate(0 6)"
            filter={paint.soft}
          />
        </g>
        <circle cx={72} cy={104} r={11} fill={paint.blush} />
        <circle cx={128} cy={104} r={11} fill={paint.blush} />
        <path d={fringe} fill={paint.hair} />
        <path
          className="fill-(--figure-hair-light) opacity-70"
          d="M74 48 C88 34 118 32 134 48 C118 40 92 41 74 48 Z"
        />

        {/* Eyebrows rise a little with a smile. */}
        <g
          className={cn(
            'stroke-(--figure-hair) transition-[translate] duration-(--duration-base) ease-standard motion-reduce:transition-none',
            smiling && '-translate-y-0.5',
          )}
        >
          <path d="M70 77 Q80 71 91 75" fill="none" strokeWidth={2.8} strokeLinecap="round" />
          <path d="M109 75 Q120 71 130 77" fill="none" strokeWidth={2.8} strokeLinecap="round" />
        </g>
        <AvatarEye x={81} smiling={smiling} paint={paint} lashes={-1} />
        <AvatarEye x={119} smiling={smiling} paint={paint} lashes={1} />

        {/* A small, soft nose: the tip and its shadow. */}
        <ellipse className="fill-(--figure-skin-light)" cx={100} cy={101} rx={5.5} ry={4.2} />
        <circle className="fill-(--figure-eye-white) opacity-50" cx={98.5} cy={99.6} r={1.3} />
        <path
          className="stroke-(--figure-skin-deep) opacity-50"
          d="M95 104 Q100 107.5 105 104"
          fill="none"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <AvatarMouth shape={mouth} smiling={smiling} />
      </AvatarHead>

      <AvatarThumbsUp shown={mood === 'encourage'} paint={paint} />
    </AvatarFrame>
  )
}
