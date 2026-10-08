import { describe, expect, it } from 'vitest'
import { challengeText } from './weekChallenges'
import { builtInWeekRoleplays, turnCue } from './weekRoleplays'
import {
  builtInWeekScenarios,
  CHALLENGE_LEVELS,
  DEFAULT_CHALLENGE_LEVEL,
  isChallengeLevel,
  MAX_SCENARIO_NAME_LENGTH,
  MAX_SCENARIOS,
  weekScenarios,
  weekScenariosSchema,
} from './weekScenarios'

const parse = (value: unknown) => weekScenariosSchema.parse(value)
const roleplay = {
  partner: 'the barista',
  imageUrl: null,
  turns: [{ partner: 'What would you like?', reply: 'A coffee, please.', cues: {} }],
}
const scenario = {
  name: { text: 'Takeaway café', translations: { bn: 'টেকঅ্যাওয়ে ক্যাফে' } },
  roleplay,
}
const content = { scenarios: [scenario] }

describe('the levels of a challenge', () => {
  it('are three, with the middle one to start on', () => {
    expect(CHALLENGE_LEVELS).toEqual(['easier', 'standard', 'harder'])
    expect(DEFAULT_CHALLENGE_LEVEL).toBe('standard')
    expect(isChallengeLevel('harder')).toBe(true)
    expect(isChallengeLevel('impossible')).toBe(false)
    expect(isChallengeLevel(null)).toBe(false)
  })
})

describe('the built-in scenarios', () => {
  it.each(Object.entries(builtInWeekScenarios))(
    'week %s is a set the schema would accept unchanged, key order included',
    (week, written) => {
      expect(written?.scenarios.length).toBeGreaterThanOrEqual(2)
      expect(written?.scenarios.length).toBeLessThanOrEqual(MAX_SCENARIOS)
      // The editor compares an edit with the built-in content as text, so the order matters too.
      expect(JSON.stringify(parse({ [week]: written }))).toBe(JSON.stringify({ [week]: written }))
    },
  )

  it('are named, and tell what to say, in Bengali and Hindi too', () => {
    for (const written of Object.values(builtInWeekScenarios)) {
      for (const entry of written?.scenarios ?? []) {
        expect(challengeText(entry.name, 'bn'), entry.name.text).toMatchObject({ lang: 'bn' })
        expect(challengeText(entry.name, 'hi'), entry.name.text).toMatchObject({ lang: 'hi' })
        for (const turn of entry.roleplay.turns) {
          expect(turnCue(turn, 'bn'), turn.partner).toMatchObject({ lang: 'bn' })
          expect(turnCue(turn, 'hi'), turn.partner).toMatchObject({ lang: 'hi' })
        }
      }
    }
  })

  it('are new situations: each with a partner of its own, and none the week’s role-play again', () => {
    for (const [week, written] of Object.entries(builtInWeekScenarios)) {
      const partners = (written?.scenarios ?? []).map((entry) => entry.roleplay.partner)
      expect(new Set(partners).size).toBe(partners.length)
      expect(partners).not.toContain(builtInWeekRoleplays[Number(week)]?.partner)
    }
  })
})

describe('weekScenariosSchema', () => {
  it('keeps scenarios that have an English name and a role-play that can be played, tidied', () => {
    expect(
      parse({
        2: {
          scenarios: [
            {
              name: {
                text: '  Takeaway  café ',
                translations: { hi: ' कैफ़े ', bn: 'ক্যাফে', x: 7 },
              },
              roleplay: {
                partner: ' the barista ',
                imageUrl: 'javascript:alert(1)',
                turns: [
                  { partner: ' What would you like? ', reply: ' A coffee, please. ' },
                  { partner: 'No reply to this one', reply: '' },
                ],
              },
            },
            { name: { text: '', translations: { bn: 'শুধু বাংলা' } }, roleplay },
            { name: { text: 'No role-play' } },
            { name: { text: 'No turns' }, roleplay: { partner: 'the baker', turns: [] } },
            'nonsense',
          ],
        },
      }),
    ).toEqual({
      2: {
        scenarios: [
          {
            name: { text: 'Takeaway café', translations: { bn: 'ক্যাফে', hi: 'कैफ़े' } },
            roleplay,
          },
        ],
      },
    })
  })

  it('drops a week that does not exist or has no usable scenario', () => {
    expect(
      parse({
        0: content,
        51: content,
        '07': content,
        3: { scenarios: [] },
        4: { scenarios: 'nonsense' },
        5: 'nonsense',
        6: content,
      }),
    ).toEqual({ 6: content })
  })

  it('drops a name that is too long, and scenarios beyond the limit', () => {
    const kept = parse({
      1: {
        scenarios: [
          { ...scenario, name: { text: 'x'.repeat(MAX_SCENARIO_NAME_LENGTH + 1) } },
          ...Array.from({ length: MAX_SCENARIOS + 2 }, () => scenario),
        ],
      },
    })[1]

    expect(kept?.scenarios).toHaveLength(MAX_SCENARIOS)
    expect(kept?.scenarios[0]).toEqual(scenario)
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('weekScenarios', () => {
  it('prefers what the admin wrote, then the built-in scenarios, then none', () => {
    expect(weekScenarios(1)).toBe(builtInWeekScenarios[1])
    expect(weekScenarios(1, { 1: content })).toBe(content)
    expect(weekScenarios(2)).toBeNull()
    expect(weekScenarios(2, { 2: content })).toBe(content)
  })
})
