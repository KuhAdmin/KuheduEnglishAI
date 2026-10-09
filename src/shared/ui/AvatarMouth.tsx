import type { MouthShape } from '@/shared/lib/audio/lipSync'
import { cn } from '@/shared/lib/cn'

export type AvatarMouthProps = {
  shape: MouthShape
  /** A wide smile, teeth showing, for as long as nothing is being said (`rest`). */
  smiling: boolean
}

const lip = {
  className: 'stroke-(--figure-lip)',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const
const inside = 'fill-(--figure-mouth)'
const teeth = 'fill-(--figure-teeth)'

/**
 * The mouth of a drawn face, in the shape asked for. It is drawn inside the face's own `<svg>`,
 * around the point (100, 116) of a 200 by 200 picture.
 */
export function AvatarMouth({ shape, smiling }: AvatarMouthProps) {
  if (shape === 'rest' && smiling) {
    return (
      <g data-part="mouth">
        <path {...lip} d="M81 109 Q100 116 119 109 Q100 134 81 109 Z" strokeWidth={3} />
        <path className={inside} d="M83 110.5 Q100 117 117 110.5 Q100 131 83 110.5 Z" />
        <path className={teeth} d="M85 111.5 Q100 117.5 115 111.5 Q100 122 85 111.5 Z" />
        <path
          className="stroke-(--figure-lip-light)"
          d="M90 122.5 Q100 128.5 110 122.5"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
    )
  }

  switch (shape) {
    case 'rest':
      // Closed lips with the corners up: the upper lip, and a fuller, lighter lower one.
      return (
        <g data-part="mouth">
          <path
            className="fill-(--figure-lip-light)"
            d="M88 114 Q100 126 112 114 Q100 118.5 88 114 Z"
          />
          <path
            className="fill-(--figure-lip)"
            d="M86.5 113 Q94 111 100 113 Q106 111 113.5 113 Q100 120 86.5 113 Z"
          />
        </g>
      )
    case 'closed':
      return (
        <g data-part="mouth">
          <path
            className="fill-(--figure-lip-light)"
            d="M90 116 Q100 123 110 116 Q100 118 90 116 Z"
          />
          <path
            className="fill-(--figure-lip)"
            d="M89 115.5 Q95 113.5 100 115 Q105 113.5 111 115.5 Q100 119 89 115.5 Z"
          />
        </g>
      )
    case 'mid':
      return (
        <g data-part="mouth">
          <ellipse
            {...lip}
            className={cn(lip.className, inside)}
            cx={100}
            cy={116}
            rx={9.5}
            ry={5}
            strokeWidth={2.5}
          />
          <path className={teeth} d="M93 113 H107 V115.2 H93 Z" />
        </g>
      )
    case 'open':
      return (
        <g data-part="mouth">
          <ellipse
            {...lip}
            className={cn(lip.className, inside)}
            cx={100}
            cy={118}
            rx={10}
            ry={9.5}
            strokeWidth={2.5}
          />
          <path className={teeth} d="M93.5 111.5 H106.5 V114 H93.5 Z" />
          <ellipse className="fill-(--figure-tongue)" cx={100} cy={123.5} rx={5.5} ry={3} />
        </g>
      )
    case 'wide':
      return (
        <g data-part="mouth">
          <path
            {...lip}
            className={cn(lip.className, teeth)}
            d="M84 113 Q100 116 116 113 Q100 124 84 113 Z"
            strokeWidth={2.5}
          />
          <path className="stroke-(--figure-mouth)" d="M88 116 H112" fill="none" strokeWidth={1} />
        </g>
      )
    case 'round':
      return (
        <ellipse
          {...lip}
          data-part="mouth"
          className={cn(lip.className, inside)}
          cx={100}
          cy={117}
          rx={5.5}
          ry={6.5}
          strokeWidth={3}
        />
      )
  }
}
