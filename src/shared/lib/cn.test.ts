import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets later Tailwind classes win', () => {
    expect(cn('px-4 text-fg', 'px-6')).toBe('text-fg px-6')
  })

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })
})
