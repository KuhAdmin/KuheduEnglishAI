import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues } from './weekDialogues'
import {
  builtInWeekVocabularies,
  MAX_MEANING_LENGTH,
  MAX_VOCABULARY_WORDS,
  MAX_WORD_LENGTH,
  syllableLetters,
  syllablesSpell,
  weekVocabulariesSchema,
  weekVocabulary,
  wordMeaning,
  wordTips,
} from './weekVocabulary'

const parse = (value: unknown) => weekVocabulariesSchema.parse(value)
// What a word has when nothing is written about how it is said.
const unsaid = { syllables: [], stress: null, tips: {} }
const word = {
  word: 'coffee',
  phonetic: '/ˈkɒfi/',
  imageUrl: null,
  meanings: { bn: 'কফি' },
  ...unsaid,
}

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

  it('says how every word is said: parts that spell it, and tips in all three languages', () => {
    for (const vocabulary of Object.values(builtInWeekVocabularies)) {
      for (const entry of vocabulary?.words ?? []) {
        expect(syllablesSpell(entry.word, entry.syllables), entry.word).toBe(true)
        // A word of one part has no strong part to mark; every other word has one.
        if (entry.syllables.length > 1) expect(entry.stress, entry.word).not.toBeNull()
        for (const language of ['bn', 'en', 'hi']) {
          expect(entry.tips[language]?.length, `${entry.word} ${language}`).toBeGreaterThan(0)
        }
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
            ...unsaid,
          },
          { word: 'name', phonetic: '', imageUrl: null, meanings: {}, ...unsaid },
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
    expect(kept[0]).toEqual({ word: 'tea', phonetic: '', imageUrl: null, meanings: {}, ...unsaid })
  })

  it('keeps how a word is said: its parts, the strong one, and tips by language', () => {
    const said = {
      word: 'Wednesday',
      syllables: [' We(d)n(e)s ', 'day'],
      stress: 1,
      tips: {
        hi: ['“d” नहीं बोला जाता।'],
        en: [' The “d” is not said. ', '', 'x', 'y', 'z'],
        ta: [],
      },
    }

    expect(parse({ 1: { words: [said] } })[1]?.words[0]).toMatchObject({
      syllables: ['We(d)n(e)s', 'day'],
      stress: 1,
      tips: { en: ['The “d” is not said.', 'x', 'y'], hi: ['“d” नहीं बोला जाता।'] },
    })
  })

  it.each([
    ['parts that spell another word', { syllables: ['Wed', 'nes'], stress: 1 }],
    ['a part with nothing said in it', { syllables: ['(Wednes)', 'day'], stress: 1 }],
    ['brackets left open', { syllables: ['We(dnes', 'day'], stress: 1 }],
    ['more parts than a word may have', { syllables: 'Wednesday'.split(''), stress: 1 }],
    ['parts that are not a list', { syllables: 'Wednes-day', stress: 1 }],
  ])('drops %s, and the strong part with them', (_, written) => {
    expect(parse({ 1: { words: [{ word: 'Wednesday', ...written }] } })[1]?.words[0]).toEqual({
      word: 'Wednesday',
      phonetic: '',
      imageUrl: null,
      meanings: {},
      ...unsaid,
    })
  })

  it.each([0, 3, 1.5, '1', null])('drops a strong part of %j from a word of two', (stress) => {
    const written = { word: 'hello', syllables: ['hel', 'lo'], stress }
    expect(parse({ 1: { words: [written] } })[1]?.words[0]).toMatchObject({
      syllables: ['hel', 'lo'],
      stress: null,
    })
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('syllablesSpell', () => {
  it('holds when the parts, brackets and spaces aside, are the word', () => {
    expect(syllablesSpell('Wednesday', ['We(d)n(e)s', 'day'])).toBe(true)
    expect(syllablesSpell('good morning', ['good', 'mor', 'ning'])).toBe(true)
    expect(syllablesSpell('What’s', ['what’s'])).toBe(true)
    expect(syllablesSpell('T-shirt', ['T', 'shirt'])).toBe(true)
  })

  it('fails for no parts, an empty part, and letters added, missing or out of place', () => {
    expect(syllablesSpell('hello', [])).toBe(false)
    expect(syllablesSpell('hello', ['hel', '', 'lo'])).toBe(false)
    expect(syllablesSpell('hello', ['hel', 'low'])).toBe(false)
    expect(syllablesSpell('hello', ['he', 'lo'])).toBe(false)
    expect(syllablesSpell('hello', ['lo', 'hel'])).toBe(false)
    expect(syllablesSpell('name', ['nam()e'])).toBe(false)
    expect(syllablesSpell('name', ['na(m(e))'])).toBe(false)
  })
})

describe('syllableLetters', () => {
  it('tells the letters that are said from the ones that are not', () => {
    expect(syllableLetters('We(d)n(e)s')).toEqual([
      { text: 'We', silent: false },
      { text: 'd', silent: true },
      { text: 'n', silent: false },
      { text: 'e', silent: true },
      { text: 's', silent: false },
    ])
    expect(syllableLetters('day')).toEqual([{ text: 'day', silent: false }])
  })
})

describe('wordTips', () => {
  const tipped = { ...word, tips: { bn: ['বাংলা'], en: ['English'] } }

  it('gives the learner’s language, through its base if need be, and English otherwise', () => {
    expect(wordTips(tipped, 'bn-IN')).toEqual({ lang: 'bn', tips: ['বাংলা'] })
    expect(wordTips(tipped, 'hi')).toEqual({ lang: 'en', tips: ['English'] })
    expect(wordTips(word, 'hi')).toEqual({ lang: 'en', tips: [] })
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
