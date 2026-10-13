import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues } from './weekDialogues'
import {
  builtInWeekRoleplays,
  MAX_PARTNER_LINE_LENGTH,
  MAX_ROLEPLAY_TURNS,
  partnerNameFor,
  roleplayPlayedBy,
  turnCue,
  weekRoleplay,
  weekRoleplaysSchema,
} from './weekRoleplays'

const parse = (value: unknown) => weekRoleplaysSchema.parse(value)
const turn = {
  partner: 'What would you like today?',
  reply: 'I’d like a coffee, please.',
  cues: { bn: 'ভদ্রভাবে এক কাপ কফি চান।' },
}
const roleplay = { partner: 'the barista', imageUrl: null, turns: [turn] }
const words = (text: string) => text.toLowerCase().replace(/[^a-z’ ]/g, '')

describe('the built-in role-plays', () => {
  it.each(Object.entries(builtInWeekRoleplays))(
    'week %s is a role-play the schema would accept unchanged, key order included',
    (week, content) => {
      expect(content?.partner).toBeTruthy()
      expect(content?.turns.length).toBeGreaterThanOrEqual(3)
      expect(content?.turns.length).toBeLessThanOrEqual(MAX_ROLEPLAY_TURNS)
      // The editor compares an edit with the built-in content as text, so the order matters too.
      expect(JSON.stringify(parse({ [week]: content }))).toBe(JSON.stringify({ [week]: content }))
    },
  )

  it('tells every turn’s reply as a cue in Bengali and Hindi', () => {
    for (const content of Object.values(builtInWeekRoleplays)) {
      for (const entry of content?.turns ?? []) {
        expect(turnCue(entry, 'bn'), entry.reply).toMatchObject({ lang: 'bn' })
        expect(turnCue(entry, 'hi'), entry.reply).toMatchObject({ lang: 'hi' })
      }
    }
  })

  it('asks of Week 1’s learner only replies its conversation has taught', () => {
    const spoken = words((builtInWeekDialogues[1]?.lines ?? []).map((line) => line.text).join(' '))
    for (const entry of builtInWeekRoleplays[1]?.turns ?? []) {
      expect(spoken, entry.reply).toContain(words(entry.reply).trim())
    }
  })
})

describe('weekRoleplaysSchema', () => {
  it('keeps turns that have both lines, tidied, with the cues in a fixed order', () => {
    expect(
      parse({
        2: {
          partner: '  the  barista ',
          imageUrl: '/people/barista.webp',
          turns: [
            {
              partner: ' Hi!  Welcome! ',
              reply: ' Hello! ',
              cues: { hi: ' नमस्ते कहें। ', bn: 'হ্যালো বলুন।', 'not a language': 'x', ta: 7 },
            },
            { partner: 'Anything else?', reply: '' },
            { partner: '', reply: 'No, thank you.' },
            'nonsense',
            { partner: 'Here you are.', reply: 'Thank you.' },
          ],
        },
      }),
    ).toEqual({
      2: {
        partner: 'the barista',
        imageUrl: '/people/barista.webp',
        turns: [
          {
            partner: 'Hi! Welcome!',
            reply: 'Hello!',
            cues: { bn: 'হ্যালো বলুন।', hi: 'नमस्ते कहें।' },
          },
          { partner: 'Here you are.', reply: 'Thank you.', cues: {} },
        ],
      },
    })
  })

  it('drops a week that does not exist, has no partner or no turn, and an unsafe picture', () => {
    expect(
      parse({
        0: roleplay,
        51: roleplay,
        '07': roleplay,
        3: { ...roleplay, partner: ' ' },
        4: { ...roleplay, turns: [] },
        5: { ...roleplay, turns: 'nonsense' },
        6: { ...roleplay, imageUrl: 'javascript:alert(1)' },
        7: { ...roleplay, imageUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
        8: { ...roleplay, imageUrl: 'data:image/webp;base64,UklGRg==' },
      }),
    ).toEqual({
      6: roleplay,
      7: roleplay,
      8: { ...roleplay, imageUrl: 'data:image/webp;base64,UklGRg==' },
    })
  })

  it('drops lines that are too long, and turns beyond the limit', () => {
    const turns = [
      { ...turn, partner: 'x'.repeat(MAX_PARTNER_LINE_LENGTH + 1) },
      ...Array.from({ length: MAX_ROLEPLAY_TURNS + 2 }, () => turn),
    ]
    expect(parse({ 1: { ...roleplay, turns } })[1]?.turns).toHaveLength(MAX_ROLEPLAY_TURNS)
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekRoleplay', () => {
  it('prefers what the admin wrote, then the built-in role-play, then none', () => {
    expect(weekRoleplay(1)).toBe(builtInWeekRoleplays[1])
    expect(weekRoleplay(1, { 1: roleplay })).toBe(roleplay)
    expect(weekRoleplay(2)).toBeNull()
    expect(weekRoleplay(2, { 2: roleplay })).toBe(roleplay)
  })
})

describe('turnCue', () => {
  it('is found through the base of a regional language, and may be missing', () => {
    expect(turnCue(turn, 'bn')).toEqual({ lang: 'bn', text: 'ভদ্রভাবে এক কাপ কফি চান।' })
    expect(turnCue(turn, 'bn-IN')).toEqual({ lang: 'bn', text: 'ভদ্রভাবে এক কাপ কফি চান।' })
    expect(turnCue(turn, 'hi')).toBeUndefined()
  })
})

describe('a role-play as the learner’s tutor plays it', () => {
  const meetingRavi = {
    partner: 'Ravi',
    asWoman: 'Asha',
    imageUrl: null,
    turns: [
      { partner: 'Hello! Good morning.', reply: 'Good morning!', cues: {} },
      { partner: 'My name is Ravi. What’s your name?', reply: 'Nice to meet you, Ravi.', cues: {} },
      { partner: 'I like Ravioli. Ravi’s friend does too.', reply: 'My name is …', cues: {} },
    ],
  }

  it('is as it was written when the tutor fits the name it was written with', () => {
    expect(partnerNameFor(meetingRavi, 'male')).toBe('Ravi')
    // The very same role-play: nothing was made anew for a screen to take as a change.
    expect(roleplayPlayedBy(meetingRavi, 'male')).toBe(meetingRavi)
  })

  it('names the partner as fits the other tutor, in the heading and wherever a line says the name', () => {
    const played = roleplayPlayedBy(meetingRavi, 'female')

    expect(partnerNameFor(meetingRavi, 'female')).toBe('Asha')
    expect(played.partner).toBe('Asha')
    expect(played.turns.map((entry) => entry.partner)).toEqual([
      'Hello! Good morning.',
      'My name is Asha. What’s your name?',
      // The name as a whole word, also before an apostrophe; never inside a longer word.
      'I like Ravioli. Asha’s friend does too.',
    ])
    expect(played.turns[1]?.reply).toBe('Nice to meet you, Asha.')
    // What the learner is told to say in their own language names nobody, and is left alone.
    expect(played.turns[0]?.cues).toBe(meetingRavi.turns[0]?.cues)
    // And the role-play as written is untouched.
    expect(meetingRavi.turns[1]?.partner).toBe('My name is Ravi. What’s your name?')
  })

  it('keeps a partner who is not named for a man or a woman as they are, whoever plays them', () => {
    expect(roleplayPlayedBy(roleplay, 'female')).toBe(roleplay)
    expect(roleplayPlayedBy(roleplay, 'male')).toBe(roleplay)
    expect(partnerNameFor(roleplay, 'female')).toBe('the barista')
  })

  it('takes a name that holds marks of its own for what it is', () => {
    const drRavi = { ...meetingRavi, partner: 'Dr. Ravi (Jr.)', asWoman: 'Dr. Asha' }
    const line = { partner: 'I am Dr. Ravi (Jr.). Come in.', reply: 'Thank you.', cues: {} }

    expect(roleplayPlayedBy({ ...drRavi, turns: [line] }, 'female').turns[0]?.partner).toBe(
      'I am Dr. Asha. Come in.',
    )
  })

  it('is kept by the schema with its names, in the order the built-in ones are written', () => {
    const { 1: kept } = parse({ 1: { ...meetingRavi, asMan: '  Ravi K.  ', asWoman: 'Asha' } })

    expect(JSON.stringify(kept)).toBe(
      JSON.stringify({
        partner: 'Ravi',
        asWoman: 'Asha',
        asMan: 'Ravi K.',
        imageUrl: null,
        turns: meetingRavi.turns,
      }),
    )
    // An emptied name is no name: the partner is then who they were written as.
    expect(parse({ 1: { ...meetingRavi, asWoman: '   ' } })[1]).not.toHaveProperty('asWoman')
  })

  it('gives every built-in partner with a woman’s or a man’s name the other one too', () => {
    expect(partnerNameFor(weekRoleplay(1) ?? roleplay, 'female')).toBe('Asha')
    expect(partnerNameFor(weekRoleplay(1) ?? roleplay, 'male')).toBe('Ravi')
  })
})
