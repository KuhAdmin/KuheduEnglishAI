import type { AvatarPaint } from './avatarPaint'

export type AvatarEyeProps = {
  /** The eye's centre, across a 200 by 200 picture; it sits at a height of 88. */
  x: number
  /** A smile lifts the cheek, which pushes the lower lid up into the eye. */
  smiling: boolean
  paint: AvatarPaint
  /** Lashes at the outer corner: `-1` for the eye on the left of the picture, `1` for the right. */
  lashes?: -1 | 1
}

/**
 * One eye of a drawn face: large, with a shaded iris and a light in it, and the lid that closes
 * over it for a blink.
 */
export function AvatarEye({ x, smiling, paint, lashes }: AvatarEyeProps) {
  // The upper lid, and with it the white of the eye, whose lower edge a smile raises.
  const lid = smiling
    ? `M${x - 10} 89.5 Q${x} 74 ${x + 10} 89.5`
    : `M${x - 10} 88.5 A10 9 0 0 1 ${x + 10} 88.5`
  const white = smiling
    ? `${lid} Q${x} 95.5 ${x - 10} 89.5 Z`
    : `${lid} A10 9 0 0 1 ${x - 10} 88.5 Z`
  const clip = `${paint.id}-eye-${x}`
  const lash = lashes && (
    <path
      className="stroke-(--figure-hair)"
      d={`M${x + lashes * 9.6} 87 l${lashes * 3.4} -2.6`}
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  )

  return (
    <g>
      <clipPath id={clip}>
        <path d={white} />
      </clipPath>
      <path className="fill-(--figure-eye-white)" d={white} />
      <g clipPath={`url(#${clip})`}>
        <circle cx={x} cy={89.2} r={7.9} fill={paint.iris} />
        <circle className="fill-(--figure-eye)" cx={x} cy={89.2} r={3.7} />
        {/* The lid's shadow across the top of the eye. */}
        <ellipse
          className="fill-(--figure-skin-deep) opacity-30"
          cx={x}
          cy={79.5}
          rx={11}
          ry={4.5}
        />
      </g>
      <circle className="fill-(--figure-eye-white)" cx={x + 2.8} cy={86} r={2.4} />
      <circle className="fill-(--figure-eye-white) opacity-80" cx={x - 2.8} cy={92.4} r={1.1} />
      <path
        className="stroke-(--figure-hair)"
        d={lid}
        fill="none"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      {lash}

      {/* Only opacity moves, so the blink costs nothing; without motion the eyes stay open. */}
      <g data-part="eyelid" className="animate-blink opacity-0 motion-reduce:animate-none">
        <ellipse className="fill-(--figure-skin)" cx={x} cy={87} rx={12} ry={11} />
        <path
          className="stroke-(--figure-hair)"
          d={`M${x - 10} 90 Q${x} 96 ${x + 10} 90`}
          fill="none"
          strokeWidth={2.6}
          strokeLinecap="round"
        />
      </g>
    </g>
  )
}
