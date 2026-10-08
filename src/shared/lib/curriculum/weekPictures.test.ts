import { describe, expect, it } from 'vitest'
import { weekPicturesSchema } from './weekPictures'

const parse = (value: unknown) => weekPicturesSchema.parse(value)

describe('weekPicturesSchema', () => {
  it('keeps safe pictures for weeks that exist', () => {
    expect(
      parse({
        1: '/weeks/1.webp',
        20: 'data:image/webp;base64,UklGRg==',
        50: 'https://cdn.example.com/50.jpg',
      }),
    ).toEqual({
      1: '/weeks/1.webp',
      20: 'data:image/webp;base64,UklGRg==',
      50: 'https://cdn.example.com/50.jpg',
    })
  })

  it('drops weeks that do not exist, second names for a week, and unsafe sources', () => {
    expect(
      parse({
        0: '/a.png',
        51: '/a.png',
        '07': '/a.png',
        '7.0': '/a.png',
        abc: '/a.png',
        2: 'javascript:alert(1)',
        3: 'data:image/svg+xml;base64,PHN2Zz4=',
        4: null,
        5: '/kept.png',
      }),
    ).toEqual({ 5: '/kept.png' })
  })

  it.each([null, 'text', 4, []])('reads %j as "no pictures"', (value) => {
    expect(parse(value)).toEqual({})
  })
})
