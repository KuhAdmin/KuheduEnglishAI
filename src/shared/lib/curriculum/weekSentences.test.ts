import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues } from './weekDialogues'
import {
  acceptedAnswers,
  builtInWeekSentences,
  MAX_ALSO_ACCEPTED,
  MAX_SENTENCE_LENGTH,
  MAX_SENTENCES,
  MAX_TIPS,
  sentenceTips,
  sentenceTranslation,
  weekSentences,
  weekSentencesSchema,
} from './weekSentences'

const parse = (value: unknown) => weekSentencesSchema.parse(value)
const sentence = {
  english: 'I’d like a coffee, please.',
  alsoAccepted: ['I would like a coffee, please.'],
  translations: { bn: 'আমি এক কাপ কফি চাই।' },
  tips: { bn: ['শেষে “please” বলুন।'], en: ['Say “please” at the end.'] },
}
const words = (text: string) => text.toLowerCase().replace(/[^a-z’ ]/g, '')

describe('the built-in sentences', () => {
  it.each(Object.entries(builtInWeekSentences))(
    'week %s is a list the schema would accept unchanged, key order included',
    (week, content) => {
      const sentences = content?.sentences ?? []
      expect(sentences.length).toBeGreaterThanOrEqual(3)
      expect(sentences.length).toBeLessThanOrEqual(MAX_SENTENCES)
      // The editor compares an edit with the built-in content as text, so the order matters too.
      expect(JSON.stringify(parse({ [week]: content }))).toBe(JSON.stringify({ [week]: content }))
    },
  )

  it('has every sentence, and tips for it, in Bengali, Hindi and English', () => {
    for (const content of Object.values(builtInWeekSentences)) {
      for (const entry of content?.sentences ?? []) {
        expect(sentenceTranslation(entry, 'bn'), entry.english).toBeTruthy()
        expect(sentenceTranslation(entry, 'hi'), entry.english).toBeTruthy()
        for (const language of ['bn', 'hi', 'en']) {
          expect(sentenceTips(entry, language), entry.english).toMatchObject({ lang: language })
          expect(sentenceTips(entry, language).tips.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('practises in Week 1 what its conversation says', () => {
    const spoken = words((builtInWeekDialogues[1]?.lines ?? []).map((line) => line.text).join(' '))
    for (const entry of builtInWeekSentences[1]?.sentences ?? []) {
      expect(spoken, entry.english).toContain(words(entry.english))
    }
  })
})

describe('weekSentencesSchema', () => {
  it('keeps entries that have their English, tidied, with languages in a fixed order', () => {
    expect(
      parse({
        2: {
          sentences: [
            {
              english: ' How  are you? ',
              alsoAccepted: [' How are you doing? ', '', 7],
              translations: { hi: ' आप कैसे हैं? ', bn: 'আপনি কেমন আছেন?', 'not a language': 'x' },
              tips: { hi: ['एक'], en: [' One. ', '  '], bn: [], ta: 'nonsense' },
            },
            { english: '', translations: { bn: 'x' } },
            'nonsense',
            { english: 'Hello.' },
          ],
        },
      }),
    ).toEqual({
      2: {
        sentences: [
          {
            english: 'How are you?',
            alsoAccepted: ['How are you doing?'],
            translations: { bn: 'আপনি কেমন আছেন?', hi: 'आप कैसे हैं?' },
            tips: { en: ['One.'], hi: ['एक'] },
          },
          { english: 'Hello.', alsoAccepted: [], translations: {}, tips: {} },
        ],
      },
    })
  })

  it('drops a week that does not exist or has no sentence', () => {
    expect(
      parse({
        0: { sentences: [sentence] },
        51: { sentences: [sentence] },
        '07': { sentences: [sentence] },
        3: { sentences: [] },
        4: { sentences: 'nonsense' },
        5: { sentences: [sentence] },
      }),
    ).toEqual({ 5: { sentences: [sentence] } })
  })

  it('drops texts that are too long, and whatever is beyond a limit', () => {
    const many = (text: string) => Array.from({ length: 9 }, (_, index) => `${text} ${index}`)
    const kept =
      parse({
        1: {
          sentences: [
            { english: 'x'.repeat(MAX_SENTENCE_LENGTH + 1) },
            { english: 'Hi.', alsoAccepted: many('Hello'), tips: { en: many('Tip') } },
            ...Array.from({ length: MAX_SENTENCES + 2 }, () => sentence),
          ],
        },
      })[1]?.sentences ?? []

    expect(kept).toHaveLength(MAX_SENTENCES)
    expect(kept[0]?.english).toBe('Hi.')
    expect(kept[0]?.alsoAccepted).toHaveLength(MAX_ALSO_ACCEPTED)
    expect(kept[0]?.tips.en).toHaveLength(MAX_TIPS)
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekSentences', () => {
  it('prefers what the admin wrote, then the built-in sentences, then none', () => {
    const written = { sentences: [sentence] }

    expect(weekSentences(1)).toBe(builtInWeekSentences[1])
    expect(weekSentences(1, { 1: written })).toBe(written)
    expect(weekSentences(2)).toBeNull()
    expect(weekSentences(2, { 2: written })).toBe(written)
  })
})

describe('a sentence for a learner', () => {
  it('is found through the base of a regional language, and may be missing', () => {
    expect(sentenceTranslation(sentence, 'bn')).toBe('আমি এক কাপ কফি চাই।')
    expect(sentenceTranslation(sentence, 'bn-IN')).toBe('আমি এক কাপ কফি চাই।')
    expect(sentenceTranslation(sentence, 'hi')).toBeUndefined()
  })

  it('has tips in the learner’s language, else in English, else none', () => {
    expect(sentenceTips(sentence, 'bn-IN')).toEqual({ lang: 'bn', tips: ['শেষে “please” বলুন।'] })
    expect(sentenceTips(sentence, 'hi')).toEqual({ lang: 'en', tips: ['Say “please” at the end.'] })
    expect(sentenceTips({ ...sentence, tips: {} }, 'hi')).toEqual({ lang: 'en', tips: [] })
  })

  it('counts the answer and every other accepted sentence as right', () => {
    expect(acceptedAnswers(sentence)).toEqual([
      'I’d like a coffee, please.',
      'I would like a coffee, please.',
    ])
  })
})
