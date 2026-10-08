import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues } from './weekDialogues'
import {
  builtInWeekChallenges,
  challengeText,
  MAX_CHALLENGE_PHRASES,
  MAX_CHALLENGE_TASK_LENGTH,
  MAX_CHALLENGE_TASKS,
  weekChallenge,
  weekChallengesSchema,
} from './weekChallenges'

const parse = (value: unknown) => weekChallengesSchema.parse(value)
const task = { text: 'Order food and drink', translations: { bn: 'খাবার ও পানীয় অর্ডার করুন' } }
const challenge = {
  title: { text: 'Café challenge', translations: {} },
  instruction: { text: '', translations: {} },
  tasks: [task],
  phrases: [],
}
const words = (text: string) => text.toLowerCase().replace(/[^a-z’ ]/g, '')

describe('the built-in challenges', () => {
  it.each(Object.entries(builtInWeekChallenges))(
    'week %s is a challenge the schema would accept unchanged, key order included',
    (week, content) => {
      expect(content?.tasks.length).toBeGreaterThanOrEqual(3)
      expect(content?.tasks.length).toBeLessThanOrEqual(MAX_CHALLENGE_TASKS)
      // The editor compares an edit with the built-in content as text, so the order matters too.
      expect(JSON.stringify(parse({ [week]: content }))).toBe(JSON.stringify({ [week]: content }))
    },
  )

  it('is written in Bengali and Hindi from its name to its last task', () => {
    for (const content of Object.values(builtInWeekChallenges)) {
      if (!content) continue
      for (const part of [content.title, content.instruction, ...content.tasks]) {
        expect(challengeText(part, 'bn'), part.text).toMatchObject({ lang: 'bn' })
        expect(challengeText(part, 'hi'), part.text).toMatchObject({ lang: 'hi' })
      }
    }
  })

  it('offers Week 1’s learner only phrases its conversation has taught', () => {
    const spoken = words((builtInWeekDialogues[1]?.lines ?? []).map((line) => line.text).join(' '))
    for (const phrase of builtInWeekChallenges[1]?.phrases ?? []) {
      expect(spoken, phrase).toContain(words(phrase).trim())
    }
  })
})

describe('weekChallengesSchema', () => {
  it('keeps tasks written in English, tidied, with translations in a fixed order', () => {
    expect(
      parse({
        2: {
          title: {
            text: '  Café  challenge ',
            translations: { hi: ' कैफ़े ', bn: 'ক্যাফে', x: 7 },
          },
          instruction: { text: ' Place your order. ' },
          tasks: [
            { text: ' Greet the staff ', translations: { 'not a language': 'x' } },
            { text: '', translations: { bn: 'শুধু বাংলা' } },
            'nonsense',
            task,
          ],
          phrases: [' I’d like a coffee, please. ', '', 7],
        },
      }),
    ).toEqual({
      2: {
        title: { text: 'Café challenge', translations: { bn: 'ক্যাফে', hi: 'कैफ़े' } },
        instruction: { text: 'Place your order.', translations: {} },
        tasks: [{ text: 'Greet the staff', translations: {} }, task],
        phrases: ['I’d like a coffee, please.'],
      },
    })
  })

  it('drops a week that does not exist, has no name or no task', () => {
    expect(
      parse({
        0: challenge,
        51: challenge,
        '07': challenge,
        3: { ...challenge, title: { text: ' ', translations: { bn: 'ক্যাফে' } } },
        4: { ...challenge, tasks: [] },
        5: { ...challenge, tasks: 'nonsense' },
        6: { ...challenge, instruction: 'nonsense', phrases: 'nonsense' },
      }),
    ).toEqual({ 6: challenge })
  })

  it('drops texts that are too long, and whatever is beyond a limit', () => {
    const kept = parse({
      1: {
        ...challenge,
        tasks: [
          { text: 'x'.repeat(MAX_CHALLENGE_TASK_LENGTH + 1) },
          ...Array.from({ length: MAX_CHALLENGE_TASKS + 2 }, () => task),
        ],
        phrases: Array.from({ length: MAX_CHALLENGE_PHRASES + 3 }, (_, index) => `Phrase ${index}`),
      },
    })[1]

    expect(kept?.tasks).toHaveLength(MAX_CHALLENGE_TASKS)
    expect(kept?.tasks[0]).toEqual(task)
    expect(kept?.phrases).toHaveLength(MAX_CHALLENGE_PHRASES)
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekChallenge', () => {
  it('prefers what the admin wrote, then the built-in challenge, then none', () => {
    expect(weekChallenge(1)).toBe(builtInWeekChallenges[1])
    expect(weekChallenge(1, { 1: challenge })).toBe(challenge)
    expect(weekChallenge(2)).toBeNull()
    expect(weekChallenge(2, { 2: challenge })).toBe(challenge)
  })
})

describe('challengeText', () => {
  it('is in the learner’s language where it is written in it, else in English', () => {
    expect(challengeText(task, 'bn')).toEqual({ lang: 'bn', text: 'খাবার ও পানীয় অর্ডার করুন' })
    expect(challengeText(task, 'bn-IN')).toEqual({ lang: 'bn', text: 'খাবার ও পানীয় অর্ডার করুন' })
    expect(challengeText(task, 'hi')).toEqual({ lang: 'en', text: 'Order food and drink' })
    expect(challengeText(task, 'en')).toEqual({ lang: 'en', text: 'Order food and drink' })
  })
})
