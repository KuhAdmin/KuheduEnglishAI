import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { AvatarDefs } from './AvatarDefs'
import { AvatarEye } from './AvatarEye'
import { AvatarFrame, type AvatarProps } from './AvatarFrame'
import { AvatarHead } from './AvatarHead'
import { AvatarMouth } from './AvatarMouth'
import { AvatarThumbsUp } from './AvatarThumbsUp'
import { avatarPaint } from './avatarPaint'

const hair =
  'M55 88 C46 46 74 24 104 24 C138 24 154 50 145 88 C142 71 135 60 125 56 C109 67 87 67 72 57 C67 65 66 77 64 91 L55 88 Z'
const shirt = [
  '[stop-color:var(--figure-shirt-light)]',
  '[stop-color:var(--figure-shirt)]',
  '[stop-color:var(--figure-shirt-shade)]',
] as const

/**
 * A drawn man, head and shoulders, shaded to look round and lit like a 3D cartoon character:
 * he blinks, his lips take the shape given (`useLipSync()` moves them with the device's voice),
 * and his mood can be a wide smile or a thumbs up. A drawing, in its own colors whatever the
 * theme; only what is behind him is the theme's.
 */
export function MaleAvatar({ mouth = 'rest', mood = 'neutral', ...rest }: AvatarProps) {
  const paint = avatarPaint(useId())
  const smiling = mood !== 'neutral'
  // While a text is said the mouth is never at rest, even between its words.
  const speaking = mouth !== 'rest'
  const face = `${paint.id}-face`

  return (
    <AvatarFrame mouth={mouth} mood={mood} {...rest}>
      <AvatarDefs paint={paint} cloth={shirt} />
      <circle cx={100} cy={94} r={94} fill={paint.glow} />

      {/* Shoulders, in a denim shirt with an open collar. */}
      <path d="M20 200 C20 162 56 144 100 144 C144 144 180 162 180 200 Z" fill={paint.cloth} />
      <rect x={84} y={116} width={32} height={40} rx={13} fill={paint.neck} />
      <path className="fill-(--figure-shirt-light)" d="M100 170 L79 141 L63 165 L85 181 Z" />
      <path className="fill-(--figure-shirt-light)" d="M100 170 L121 141 L137 165 L115 181 Z" />
      <path
        className="stroke-(--figure-shirt-shade)"
        d="M100 170 V200"
        fill="none"
        strokeWidth={2}
      />

      <AvatarHead speaking={speaking}>
        {/* Head: ears, face, the shadow his hair throws on it, beard, hair. */}
        <ellipse cx={56} cy={94} rx={8} ry={10.5} fill={paint.skin} />
        <ellipse cx={144} cy={94} rx={8} ry={10.5} fill={paint.skin} />
        <ellipse className="fill-(--figure-skin-deep) opacity-40" cx={56} cy={95} rx={3.5} ry={6} />
        <ellipse
          className="fill-(--figure-skin-deep) opacity-40"
          cx={144}
          cy={95}
          rx={3.5}
          ry={6}
        />
        <clipPath id={face}>
          <ellipse cx={100} cy={86} rx={43} ry={48} />
        </clipPath>
        <ellipse cx={100} cy={86} rx={43} ry={48} fill={paint.skin} />
        <g clipPath={`url(#${face})`}>
          <path
            className="fill-(--figure-skin-deep) opacity-45"
            d={hair}
            transform="translate(0 6)"
            filter={paint.soft}
          />
        </g>
        <circle cx={71} cy={103} r={11} fill={paint.blush} />
        <circle cx={129} cy={103} r={11} fill={paint.blush} />
        <path
          className="fill-(--figure-hair)"
          d="M57 86 C57 125 78 139 100 139 C122 139 143 125 143 86 C140 101 130 109 119 108 C113 104 106 103 100 103 C94 103 87 104 81 108 C70 109 60 101 57 86 Z"
        />
        <path d={hair} fill={paint.hair} />
        <path
          className="fill-(--figure-hair-light) opacity-70"
          d="M76 44 C90 31 118 30 134 46 C118 38 92 38 76 44 Z"
        />

        {/* Eyebrows rise a little with a smile. */}
        <g
          className={cn(
            'fill-(--figure-hair) transition-[translate] duration-(--duration-base) ease-standard motion-reduce:transition-none',
            smiling && '-translate-y-0.5',
          )}
        >
          <path d="M66 77 Q78 67.5 91 73 Q79 71.5 68 80 Z" />
          <path d="M134 77 Q122 67.5 109 73 Q121 71.5 132 80 Z" />
        </g>
        <AvatarEye x={79} smiling={smiling} paint={paint} />
        <AvatarEye x={121} smiling={smiling} paint={paint} />

        {/* A soft, round nose: the shade down one side, the tip, and its shadow. */}
        <path
          className="stroke-(--figure-skin-shade) opacity-70"
          d="M96 86 Q93 96 94.5 100"
          fill="none"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <ellipse className="fill-(--figure-skin-light)" cx={100} cy={100.5} rx={7.5} ry={5.5} />
        <circle className="fill-(--figure-eye-white) opacity-50" cx={98} cy={98.6} r={1.6} />
        <path
          className="stroke-(--figure-skin-deep) opacity-50"
          d="M93.5 104 Q100 108.5 106.5 104"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <AvatarMouth shape={mouth} smiling={smiling} />
      </AvatarHead>

      <AvatarThumbsUp shown={mood === 'encourage'} paint={paint} />
    </AvatarFrame>
  )
}
