import type { AvatarPaint } from './avatarPaint'

export type AvatarDefsProps = {
  paint: AvatarPaint
  /** The colors of what the figure wears, from where the light falls to the shade, as classes. */
  cloth: readonly [light: string, base: string, shade: string]
}

/**
 * The shading of a drawn avatar: gradients that make flat shapes look round and lit, in the
 * figure's own colors (the `--figure-*` tokens). Goes first inside the avatar's `<svg>`.
 */
export function AvatarDefs({ paint, cloth }: AvatarDefsProps) {
  const id = (name: string) => `${paint.id}-${name}`

  return (
    <defs>
      <radialGradient id={id('skin')} cx={0.4} cy={0.34} r={0.78}>
        <stop offset={0} className="[stop-color:var(--figure-skin-light)]" />
        <stop offset={0.55} className="[stop-color:var(--figure-skin)]" />
        <stop offset={1} className="[stop-color:var(--figure-skin-shade)]" />
      </radialGradient>
      <linearGradient id={id('neck')} x1={0} y1={0} x2={0} y2={1}>
        <stop offset={0} className="[stop-color:var(--figure-skin-deep)]" />
        <stop offset={0.5} className="[stop-color:var(--figure-skin-shade)]" />
        <stop offset={1} className="[stop-color:var(--figure-skin)]" />
      </linearGradient>
      <radialGradient id={id('iris')} cx={0.5} cy={0.72} r={0.62}>
        <stop offset={0} className="[stop-color:var(--figure-iris-light)]" />
        <stop offset={1} className="[stop-color:var(--figure-iris)]" />
      </radialGradient>
      <radialGradient id={id('blush')}>
        <stop offset={0} className="[stop-color:var(--figure-blush)]" stopOpacity={0.5} />
        <stop offset={1} className="[stop-color:var(--figure-blush)]" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={id('glow')}>
        <stop offset={0} className="[stop-color:var(--color-surface)]" stopOpacity={0.85} />
        <stop offset={1} className="[stop-color:var(--color-surface)]" stopOpacity={0} />
      </radialGradient>
      <linearGradient id={id('hair')} x1={0.1} y1={0} x2={0.9} y2={1}>
        <stop offset={0} className="[stop-color:var(--figure-hair-light)]" />
        <stop offset={0.5} className="[stop-color:var(--figure-hair)]" />
      </linearGradient>
      <linearGradient id={id('cloth')} x1={0.2} y1={0} x2={0.6} y2={1}>
        <stop offset={0} className={cloth[0]} />
        <stop offset={0.4} className={cloth[1]} />
        <stop offset={1} className={cloth[2]} />
      </linearGradient>
      <filter id={id('soft')} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation={3} />
      </filter>
    </defs>
  )
}
