import { describe, expect, it } from 'vitest'
import { formatNumber } from '@/shared/lib/i18n'
import {
  curriculumKeys,
  isCurriculumKey,
  isDayNumber,
  isSectionNumber,
  isWeekNumber,
  OUTCOMES_PER_WEEK,
  SECTION_COUNT,
  sectionOfWeek,
  sectionTextKeys,
  sectionWeeks,
  WEEK_COUNT,
} from './curriculum'
import {
  curriculumOverridesSchema,
  MAX_OUTCOME_LENGTH,
  MAX_SECTION_NAME_LENGTH,
  withCurriculumText,
} from './curriculumOverrides'
import { en } from './texts/en'
import { curriculumText, curriculumTexts, getCurriculum } from './useCurriculum'

describe('the shape of the course', () => {
  it('is 50 weeks in 10 sections of 5', () => {
    expect(SECTION_COUNT).toBe(10)
    expect(WEEK_COUNT).toBe(50)
    expect(sectionWeeks(1)).toEqual([1, 2, 3, 4, 5])
    expect(sectionWeeks(4)).toEqual([16, 17, 18, 19, 20])
    expect(sectionWeeks(10)).toEqual([46, 47, 48, 49, 50])
  })

  it('knows which section a week belongs to', () => {
    expect([1, 5, 6, 20, 21, 50].map(sectionOfWeek)).toEqual([1, 1, 2, 4, 5, 10])
    // Out-of-range weeks land on the nearest section rather than nowhere.
    expect(sectionOfWeek(0)).toBe(1)
    expect(sectionOfWeek(99)).toBe(10)
  })

  it('accepts only whole section numbers from 1 to 10', () => {
    expect([1, 10].every(isSectionNumber)).toBe(true)
    expect([0, 11, 2.5, Number.NaN, '3', null].some(isSectionNumber)).toBe(false)
  })

  it('accepts only weeks 1 to 50 and days 1 to 7', () => {
    expect([1, 50].every(isWeekNumber)).toBe(true)
    expect([0, 51, 1.5, Number.NaN, '2'].some(isWeekNumber)).toBe(false)
    expect([1, 7].every(isDayNumber)).toBe(true)
    expect([0, 8, 1.5, Number.NaN].some(isDayNumber)).toBe(false)
  })

  it('gives every text an address: 10 section names and 8 texts for each of 50 weeks', () => {
    expect(curriculumKeys).toHaveLength(SECTION_COUNT + WEEK_COUNT * (3 + OUTCOMES_PER_WEEK))
    expect(new Set(curriculumKeys).size).toBe(curriculumKeys.length)
    expect(sectionTextKeys(4).slice(0, 5)).toEqual([
      'section.4',
      'week.16.goal',
      'week.16.context',
      'week.16.challenge',
      'week.16.outcome.1',
    ])
    expect(sectionTextKeys(4).slice(8, 10)).toEqual(['week.16.outcome.5', 'week.17.goal'])
    expect(['section.10', 'week.50.challenge', 'week.50.outcome.5'].every(isCurriculumKey)).toBe(
      true,
    )
    expect(['week.1.outcome.0', 'week.1.outcome.6'].some(isCurriculumKey)).toBe(false)
    expect(['section.0', 'section.11', 'week.51.goal', 'week.1.title'].some(isCurriculumKey)).toBe(
      false,
    )
  })
})

describe.each(Object.entries(curriculumTexts))('the course in "%s"', (_language, texts) => {
  it('names every section and fills in every week', () => {
    expect(texts.sections).toHaveLength(SECTION_COUNT)
    expect(texts.weeks).toHaveLength(WEEK_COUNT)
    for (const title of texts.sections) expect(title.trim()).not.toBe('')
    for (const week of texts.weeks) {
      expect(week.goal.trim()).not.toBe('')
      expect(week.context.trim()).not.toBe('')
      expect(week.challenge.trim()).not.toBe('')
    }
  })

  it('gives every week five different outcomes, each short enough for one line of a list', () => {
    for (const week of texts.weeks) {
      expect(week.outcomes).toHaveLength(OUTCOMES_PER_WEEK)
      expect(new Set(week.outcomes).size).toBe(OUTCOMES_PER_WEEK)
      for (const outcome of week.outcomes) {
        expect(outcome.trim()).not.toBe('')
        expect(outcome.length).toBeLessThanOrEqual(MAX_OUTCOME_LENGTH)
      }
    }
  })

  it('does not repeat a section name or a weekly goal', () => {
    expect(new Set(texts.sections).size).toBe(SECTION_COUNT)
    expect(new Set(texts.weeks.map((week) => week.goal)).size).toBe(WEEK_COUNT)
  })
})

describe('getCurriculum', () => {
  it('lays the weeks out under their sections', () => {
    const sections = getCurriculum('en')

    expect(sections.map((section) => section.section)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(sections[3]).toMatchObject({
      title: 'Handle Everyday Interactions',
      firstWeek: 16,
      lastWeek: 20,
    })
    expect(sections[3]?.weeks.map((week) => week.week)).toEqual([16, 17, 18, 19, 20])
    expect(sections[3]?.weeks[0]).toEqual({
      week: 16,
      goal: 'I can start and join a conversation.',
      context: 'Meeting people at a social gathering',
      challenge: 'Start small talk, show interest and introduce people.',
      outcomes: [
        'Start a conversation with small talk',
        'Show interest in what someone says',
        'Introduce one person to another',
        'Join a conversation politely',
        'Mix with people at a gathering',
      ],
    })
    // Week 20 is worded as in the design of the weekly overview.
    expect(sections[3]?.weeks[4]?.outcomes).toEqual([
      'Order food and drink',
      'Ask about the menu and price',
      'Make special requests',
      'Respond to a follow-up question',
      'Complete a natural café conversation',
    ])
    expect(sections.at(-1)?.weeks.at(-1)?.goal).toBe(
      'I can communicate independently in everyday life.',
    )
  })

  it('speaks the learner’s language, including a regional form of it', () => {
    expect(getCurriculum('bn')[0]?.title).toBe('কথা বলা শুরু করি')
    expect(getCurriculum('bn-IN')[0]?.title).toBe('কথা বলা শুরু করি')
    expect(getCurriculum('hi')[0]?.weeks[0]?.goal).toBe(
      'मुझे नमस्ते कहना और अपना परिचय देना आता है।',
    )
  })

  it('falls back to English for a language the course is not written in', () => {
    expect(getCurriculum('ta')).toEqual(getCurriculum('en'))
    expect(getCurriculum('ta')[0]?.title).toBe(en.sections[0])
  })

  it('uses an admin’s wording where they wrote their own, and the built-in course elsewhere', () => {
    const sections = getCurriculum('bn', {
      bn: {
        'section.1': 'নতুন নাম',
        'week.2.context': 'নতুন পরিস্থিতি',
        'week.2.outcome.5': 'নতুন ফলাফল',
      },
    })

    expect(sections[0]?.title).toBe('নতুন নাম')
    expect(sections[0]?.weeks[1]?.context).toBe('নতুন পরিস্থিতি')
    expect(sections[0]?.weeks[1]?.outcomes[4]).toBe('নতুন ফলাফল')
    expect(sections[0]?.weeks[1]?.outcomes[0]).toBe('কেউ কোথা থেকে এসেছেন তা জিজ্ঞেস করা')
    expect(sections[0]?.weeks[1]?.goal).toBe('আমি কারও সঙ্গে পরিচিত হতে পারি।')
    expect(sections[1]?.title).toBe('আমার রোজকার জগৎ')
  })
})

describe('curriculumText', () => {
  const overrides = {
    en: { 'section.1': 'Say Hello' },
    ta: { 'week.1.goal': 'என்னால் வணக்கம் சொல்ல முடியும்.' },
  }

  it('prefers the language’s own wording to English, whoever wrote either', () => {
    // Built-in Bengali wins over the admin's English.
    expect(curriculumText('bn', 'section.1', overrides)).toBe('কথা বলা শুরু করি')
    expect(curriculumText('en', 'section.1', overrides)).toBe('Say Hello')
    expect(curriculumText('en-IN', 'section.1', overrides)).toBe('Say Hello')
  })

  it('shows a language without its own text the English one, the admin’s first', () => {
    expect(curriculumText('ta', 'week.1.goal', overrides)).toBe('என்னால் வணக்கம் சொல்ல முடியும்.')
    expect(curriculumText('ta', 'section.1', overrides)).toBe('Say Hello')
    expect(curriculumText('ta', 'section.2', overrides)).toBe('My Everyday World')
  })
})

describe('curriculumOverridesSchema', () => {
  const parse = (value: unknown) => curriculumOverridesSchema.parse(value)

  it('keeps real wording for known texts and drops everything else', () => {
    expect(
      parse({
        hi: {
          'week.1.goal': '  नया\n लक्ष्य  ',
          'week.99.goal': 'x',
          'section.2': '   ',
          other: 'x',
        },
        bn: {
          'section.1': 'x'.repeat(MAX_SECTION_NAME_LENGTH + 1),
          'week.3.context': 7,
          'week.3.outcome.1': 'x'.repeat(MAX_OUTCOME_LENGTH + 1),
          'week.3.outcome.6': 'x',
        },
        'not a language': { 'section.1': 'x' },
        en: 'nonsense',
      }),
    ).toEqual({ hi: { 'week.1.goal': 'नया लक्ष्य' } })
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing changed"', (value) => {
    expect(parse(value)).toEqual({})
  })

  it('stores equal overrides the same way, whatever order they arrive in', () => {
    const one = parse({ hi: { 'week.2.goal': 'क', 'section.1': 'ख' }, bn: { 'section.1': 'গ' } })
    const other = parse({ bn: { 'section.1': 'গ' }, hi: { 'section.1': 'ख', 'week.2.goal': 'क' } })
    expect(JSON.stringify(one)).toBe(JSON.stringify(other))
  })
})

describe('withCurriculumText', () => {
  const saved = curriculumOverridesSchema.parse({
    bn: { 'section.1': 'গ' },
    hi: { 'section.1': 'ख', 'week.2.goal': 'क' },
  })

  it('sets one text in one language and leaves the rest alone', () => {
    expect(withCurriculumText(saved, 'bn', 'week.1.goal', 'নতুন ')).toEqual({
      bn: { 'section.1': 'গ', 'week.1.goal': 'নতুন ' },
      hi: { 'section.1': 'ख', 'week.2.goal': 'क' },
    })
    expect(saved.bn).toEqual({ 'section.1': 'গ' })
  })

  it('forgets a text put back on the built-in wording, and a language with none left', () => {
    expect(withCurriculumText(saved, 'bn', 'section.1', undefined)).toEqual({
      hi: { 'section.1': 'ख', 'week.2.goal': 'क' },
    })
    expect(withCurriculumText({}, 'ta', 'section.1', undefined)).toEqual({})
  })

  it('leaves the overrides exactly as saved once an edit is undone', () => {
    const removed = withCurriculumText(saved, 'hi', 'section.1', undefined)
    const restored = withCurriculumText(removed, 'hi', 'section.1', 'ख')
    expect(JSON.stringify(restored)).toBe(JSON.stringify(saved))

    const added = withCurriculumText(saved, 'ta', 'week.5.goal', 'x')
    expect(JSON.stringify(withCurriculumText(added, 'ta', 'week.5.goal', undefined))).toBe(
      JSON.stringify(saved),
    )
  })
})

describe('formatNumber', () => {
  it('writes numbers the way each language’s screen texts do', () => {
    expect(formatNumber('en', 16)).toBe('16')
    expect(formatNumber('hi', 16)).toBe('16')
    expect(formatNumber('bn', 16)).toBe('১৬')
    expect(formatNumber('bn', 2026)).toBe('২০২৬')
  })

  it('still gives a number for a language tag it does not know', () => {
    expect(formatNumber('not a language', 7)).toBe('7')
  })
})
