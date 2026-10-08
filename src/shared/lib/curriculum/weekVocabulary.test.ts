import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues } from './weekDialogues'
import {
  builtInWeekVocabularies,
  MAX_MEANING_LENGTH,
  MAX_VOCABULARY_WORDS,
  MAX_WORD_LENGTH,
  weekVocabulariesSchema,
  weekVocabulary,
  wordMeaning,
} from './weekVocabulary'

const parse = (value: unknown) => weekVocabulariesSchema.parse(value)
const word = { word: 'coffee', phonetic: '/ˈkɒfi/', imageUrl: null, meanings: { bn: 'কফি' } }

describe('the built-in vocabulary', () => {
  it.each(Object.entries(builtInWeekVocabularies))(
    'week %s is a list of different words the schema would accept unchanged',
    (week, vocabulary) => {
      const words = vocabulary?.words ?? []
      expect(words.length).toBeGreaterThanOrEqual(4)
      expect(words.length).toBeLessThanOrEqual(MAX_VOCABULARY_WORDS)
      expect(new Set(words.map((entry) => entry.word)).size).toBe(words.length)
      expect(parse({ [week]: vocabulary })).toEqual({ [week]: vocabulary })
    },
  )

  it('has a phonetic spelling and a Bengali and Hindi meaning for every word', () => {
    for (const vocabulary of Object.values(builtInWeekVocabularies)) {
      for (const entry of vocabulary?.words ?? []) {
        expect(entry.phonetic).toMatch(/^\/.+\/$/)
        expect(wordMeaning(entry, 'bn')).toBeTruthy()
        expect(wordMeaning(entry, 'hi')).toBeTruthy()
      }
    }
  })

  it('teaches Week 1 the words its conversation uses', () => {
    const spoken = (builtInWeekDialogues[1]?.lines ?? [])
      .map((line) => line.text.toLowerCase())
      .join(' ')
    for (const entry of builtInWeekVocabularies[1]?.words ?? []) {
      expect(spoken, entry.word).toContain(entry.word)
    }
  })
})

describe('weekVocabulariesSchema', () => {
  it('keeps entries that have a word, tidied, with their meanings in a fixed order', () => {
    expect(
      parse({
        2: {
          words: [
            {
              word: ' good  morning ',
              phonetic: ' /ɡʊd/ ',
              imageUrl: '/words/a.webp',
              meanings: { hi: ' सुप्रभात ', bn: 'সুপ্রভাত' },
            },
            { word: '', phonetic: '/x/' },
            'nonsense',
            { word: 'name', meanings: { 'not a language': 'x', bn: '  ', ta: 7 } },
          ],
        },
      }),
    ).toEqual({
      2: {
        words: [
          {
            word: 'good morning',
            phonetic: '/ɡʊd/',
            imageUrl: '/words/a.webp',
            meanings: { bn: 'সুপ্রভাত', hi: 'सुप्रभात' },
          },
          { word: 'name', phonetic: '', imageUrl: null, meanings: {} },
        ],
      },
    })
  })

  it('drops a week that does not exist or has no word, and an unsafe picture', () => {
    expect(
      parse({
        0: { words: [word] },
        51: { words: [word] },
        '07': { words: [word] },
        3: { words: [] },
        4: { words: 'nonsense' },
        5: { words: [{ ...word, imageUrl: 'javascript:alert(1)' }] },
        6: { words: [{ ...word, imageUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }] },
        7: { words: [{ ...word, imageUrl: 'data:image/webp;base64,UklGRg==' }] },
      }),
    ).toEqual({
      5: { words: [word] },
      6: { words: [word] },
      7: { words: [{ ...word, imageUrl: 'data:image/webp;base64,UklGRg==' }] },
    })
  })

  it('drops texts that are too long, and words beyond the limit', () => {
    const words = [
      { word: 'x'.repeat(MAX_WORD_LENGTH + 1) },
      { word: 'tea', meanings: { bn: 'x'.repeat(MAX_MEANING_LENGTH + 1) } },
      ...Array.from({ length: MAX_VOCABULARY_WORDS + 2 }, () => word),
    ]
    const kept = parse({ 1: { words } })[1]?.words ?? []

    expect(kept).toHaveLength(MAX_VOCABULARY_WORDS)
    expect(kept[0]).toEqual({ word: 'tea', phonetic: '', imageUrl: null, meanings: {} })
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekVocabulary', () => {
  it('prefers what the admin wrote, then the built-in words, then none', () => {
    const written = { words: [word] }

    expect(weekVocabulary(1)).toBe(builtInWeekVocabularies[1])
    expect(weekVocabulary(1, { 1: written })).toBe(written)
    expect(weekVocabulary(2)).toBeNull()
    expect(weekVocabulary(2, { 2: written })).toBe(written)
  })
})

describe('wordMeaning', () => {
  it('finds a regional form through its base language, and admits when there is none', () => {
    expect(wordMeaning(word, 'bn')).toBe('কফি')
    expect(wordMeaning(word, 'bn-IN')).toBe('কফি')
    expect(wordMeaning(word, 'hi')).toBeUndefined()
  })
})
