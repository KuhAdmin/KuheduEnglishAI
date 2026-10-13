import { describe, expect, it } from 'vitest'
import { fitWithin } from './imageUpload'

describe('fitWithin', () => {
  it('shrinks to fit while keeping the proportions', () => {
    expect(fitWithin(4000, 2000, { maxWidth: 1000, maxHeight: 1000 })).toEqual({
      width: 1000,
      height: 500,
    })
    expect(fitWithin(1000, 4000, { maxWidth: 1080, maxHeight: 1920 })).toEqual({
      width: 480,
      height: 1920,
    })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(64, 48, { maxWidth: 256, maxHeight: 256 })).toEqual({ width: 64, height: 48 })
  })
})
