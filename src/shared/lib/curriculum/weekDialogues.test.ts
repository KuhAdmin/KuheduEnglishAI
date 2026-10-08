import { describe, expect, it } from 'vitest'
import {
  builtInWeekDialogues,
  lineTranslation,
  MAX_DIALOGUE_LINES,
  MAX_LINE_LENGTH,
  MAX_LINE_TRANSLATION_LENGTH,
  MAX_SPEAKER_LENGTH,
  weekDialogue,
  weekDialoguesSchema,
} from './weekDialogues'

const parse = (value: unknown) => weekDialoguesSchema.parse(value)
const line = { speaker: 'Asha', text: 'Hello!', translations: { bn: 'হ্যালো!' } }

describe('the built-in conversations', () => {
  it.each(Object.entries(builtInWeekDialogues))(
    'week %s is a complete conversation the schema would accept unchanged',
    (week, dialogue) => {
      expect(dialogue?.lines.length).toBeGreaterThanOrEqual(4)
      expect(parse({ [week]: dialogue })).toEqual({ [week]: dialogue })
    },
  )

  it('are translated into Bengali and Hindi, line for line', () => {
    for (const dialogue of Object.values(builtInWeekDialogues)) {
      for (const written of dialogue?.lines ?? []) {
        expect(lineTranslation(written, 'bn')).toBeTruthy()
        expect(lineTranslation(written, 'hi')).toBeTruthy()
      }
    }
  })

  it('give Week 1 two people meeting for the first time', () => {
    const lines = builtInWeekDialogues[1]?.lines ?? []
    expect([...new Set(lines.map((written) => written.speaker))]).toEqual(['Asha', 'Ravi'])
    expect(lines[0]?.text).toBe('Hello! Good morning.')
    expect(lines.some((written) => written.text.includes('What’s your name?'))).toBe(true)
  })
})

describe('weekDialoguesSchema', () => {
  it('keeps finished lines, tidied, with their translations in a fixed order', () => {
    expect(
      parse({
        2: {
          videoUrl: ' https://cdn.example.com/week2.mp4 ',
          lines: [
            {
              speaker: ' Asha ',
              text: ' Hello!\n How are you? ',
              translations: { hi: ' नमस्ते ', bn: 'হ্যালো' },
            },
            { speaker: '', text: 'No speaker' },
            { speaker: 'Ravi', text: '  ' },
            'nonsense',
            {
              speaker: 'Ravi',
              text: 'Fine.',
              translations: { 'not a language': 'x', bn: '   ', ta: 7 },
            },
          ],
        },
      }),
    ).toEqual({
      2: {
        videoUrl: 'https://cdn.example.com/week2.mp4',
        lines: [
          {
            speaker: 'Asha',
            text: 'Hello! How are you?',
            translations: { bn: 'হ্যালো', hi: 'नमस्ते' },
          },
          { speaker: 'Ravi', text: 'Fine.', translations: {} },
        ],
      },
    })
  })

  it('drops a week that does not exist, one with no finished line, and an unsafe video link', () => {
    expect(
      parse({
        0: { lines: [line] },
        51: { lines: [line] },
        '07': { lines: [line] },
        3: { videoUrl: 'https://cdn.example.com/a.mp4', lines: [] },
        4: { lines: 'nonsense' },
        5: { videoUrl: 'javascript:alert(1)', lines: [line] },
        6: { videoUrl: 'data:video/mp4;base64,AAAA', lines: [line] },
      }),
    ).toEqual({
      5: { videoUrl: null, lines: [line] },
      6: { videoUrl: null, lines: [line] },
    })
  })

  it('drops texts that are too long, and lines beyond the limit', () => {
    const lines = [
      { speaker: 'x'.repeat(MAX_SPEAKER_LENGTH + 1), text: 'Hello' },
      { speaker: 'Asha', text: 'x'.repeat(MAX_LINE_LENGTH + 1) },
      {
        speaker: 'Asha',
        text: 'Hi',
        translations: { bn: 'x'.repeat(MAX_LINE_TRANSLATION_LENGTH + 1) },
      },
      ...Array.from({ length: MAX_DIALOGUE_LINES + 3 }, () => line),
    ]
    const kept = parse({ 1: { lines } })[1]?.lines ?? []

    expect(kept).toHaveLength(MAX_DIALOGUE_LINES)
    expect(kept[0]).toEqual({ speaker: 'Asha', text: 'Hi', translations: {} })
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekDialogue', () => {
  it('prefers what the admin wrote, then the built-in conversation, then none', () => {
    const written = { videoUrl: null, lines: [line] }

    expect(weekDialogue(1)).toBe(builtInWeekDialogues[1])
    expect(weekDialogue(1, { 1: written })).toBe(written)
    expect(weekDialogue(2)).toBeNull()
    expect(weekDialogue(2, { 2: written })).toBe(written)
  })
})

describe('lineTranslation', () => {
  it('finds a regional form through its base language, and admits when there is none', () => {
    expect(lineTranslation(line, 'bn')).toBe('হ্যালো!')
    expect(lineTranslation(line, 'bn-IN')).toBe('হ্যালো!')
    expect(lineTranslation(line, 'ta')).toBeUndefined()
  })
})
