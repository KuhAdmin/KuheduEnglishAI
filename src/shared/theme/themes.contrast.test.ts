import { describe, expect, it } from 'vitest'
import tokensCss from '../styles/tokens.css?raw'
import { themes } from './themes'

/** Extract `--color-*` declarations from the CSS block that starts at `blockStart`. */
function readColorTokens(blockStart: string): Record<string, string> {
  const start = tokensCss.indexOf(blockStart)
  if (start === -1) throw new Error(`Block not found in tokens.css: ${blockStart}`)
  const body = tokensCss.slice(start, tokensCss.indexOf('\n}', start))
  const tokens: Record<string, string> = {}
  for (const match of body.matchAll(/--color-([a-z-]+):\s*([^;]+);/g)) {
    const [, name, value] = match
    if (name && value) tokens[name] = value.trim()
  }
  return tokens
}

function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`Expected a 6-digit hex color, got "${hex}"`)
  const linear = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(1) + 0.7152 * linear(3) + 0.0722 * linear(5)
}

function contrast(foreground: string, background: string): number {
  const a = luminance(foreground)
  const b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function requireToken(tokens: Record<string, string>, name: string): string {
  const value = tokens[name]
  if (!value) throw new Error(`Missing token --color-${name}`)
  return value
}

// [foreground token, background token, minimum WCAG ratio]
const pairs: [string, string, number][] = [
  ['fg', 'bg', 4.5],
  ['fg-muted', 'bg', 4.5],
  ['fg-subtle', 'bg', 4.5],
  ['fg', 'surface', 4.5],
  ['fg-muted', 'surface', 4.5],
  ['fg', 'surface-sunken', 4.5],
  ['fg-inverse', 'fg', 4.5],
  ['primary', 'bg', 4.5],
  ['primary', 'surface', 4.5],
  ['on-primary', 'primary', 4.5],
  ['on-primary', 'primary-pressed', 4.5],
  ['on-primary-soft', 'primary-soft', 4.5],
  ['on-accent-soft', 'accent-soft', 4.5],
  ['success', 'bg', 4.5],
  ['warning', 'bg', 4.5],
  ['danger', 'bg', 4.5],
  ['on-hero', 'hero-scrim', 4.5],
  ['on-hero-muted', 'hero-scrim', 4.5],
  // Non-text UI: focus rings (on-hero is the ring color over the hero scrim).
  ['focus', 'bg', 3],
  ['focus', 'surface', 3],
]

const baseTokens = readColorTokens('@theme {')
const themedTokenNames = Object.keys(readColorTokens(`[data-theme='${themes[0].id}']`)).sort()

describe.each(themes)('theme "$id"', ({ id }) => {
  const tokens = readColorTokens(`[data-theme='${id}']`)

  it('defines every color token', () => {
    expect(Object.keys(tokens).sort()).toEqual(themedTokenNames)
  })

  it.each(pairs)('%s on %s has contrast ≥ %d', (foreground, background, minimum) => {
    const ratio = contrast(requireToken(tokens, foreground), requireToken(tokens, background))
    expect(ratio, `${foreground} on ${background} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
      minimum,
    )
  })
})

describe('default tokens', () => {
  it('mirror the Indigo Dawn theme', () => {
    const indigoDawn = readColorTokens(`[data-theme='indigo-dawn']`)
    for (const [name, value] of Object.entries(indigoDawn)) {
      expect(baseTokens[name], `--color-${name}`).toBe(value)
    }
  })
})
