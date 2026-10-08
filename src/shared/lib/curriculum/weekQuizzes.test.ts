import { describe, expect, it } from 'vitest'
import { challengeText } from './weekChallenges'
import { builtInWeekDialogues } from './weekDialogues'
import {
  builtInWeekQuizzes,
  MAX_QUIZ_CHOICE_LENGTH,
  MAX_QUIZ_OTHERS,
  MAX_QUIZ_QUESTIONS,
  sameChoice,
  weekQuiz,
  weekQuizzesSchema,
} from './weekQuizzes'

const parse = (value: unknown) => weekQuizzesSchema.parse(value)
const question = {
  question: { text: 'How do you order a coffee?', translations: { bn: 'কফি কীভাবে চাইবেন?' } },
  answer: 'A coffee, please.',
  others: ['Goodbye.', 'Thank you.'],
}
const quiz = { questions: [question] }
const words = (text: string) => text.toLowerCase().replace(/[^a-z’ ]/g, '')

describe('the built-in quizzes', () => {
  it.each(Object.entries(builtInWeekQuizzes))(
    'week %s is a quiz the schema would accept unchanged, key order included',
    (week, content) => {
      expect(content?.questions.length).toBeGreaterThanOrEqual(3)
      expect(content?.questions.length).toBeLessThanOrEqual(MAX_QUIZ_QUESTIONS)
      // The editor compares an edit with the built-in content as text, so the order matters too.
      expect(JSON.stringify(parse({ [week]: content }))).toBe(JSON.stringify({ [week]: content }))
    },
  )

  it('asks every question in Bengali and Hindi too', () => {
    for (const content of Object.values(builtInWeekQuizzes)) {
      for (const entry of content?.questions ?? []) {
        expect(challengeText(entry.question, 'bn'), entry.question.text).toMatchObject({
          lang: 'bn',
        })
        expect(challengeText(entry.question, 'hi'), entry.question.text).toMatchObject({
          lang: 'hi',
        })
      }
    }
  })

  it('offers Week 1’s learner only choices its conversation has taught', () => {
    const spoken = words((builtInWeekDialogues[1]?.lines ?? []).map((line) => line.text).join(' '))
    for (const entry of builtInWeekQuizzes[1]?.questions ?? []) {
      for (const choice of [entry.answer, ...entry.others]) {
        expect(spoken, choice).toContain(words(choice).trim())
      }
    }
  })
})

describe('weekQuizzesSchema', () => {
  it('keeps questions asked in English that have an answer and another choice, tidied', () => {
    expect(
      parse({
        2: {
          questions: [
            {
              question: {
                text: '  How do you  order? ',
                translations: { hi: ' कैसे ', bn: 'কীভাবে' },
              },
              answer: ' A coffee,  please. ',
              others: [' Goodbye. ', '', 7, 'Thank you.'],
            },
            {
              question: { text: '', translations: { bn: 'শুধু বাংলা' } },
              answer: 'x',
              others: ['y'],
            },
            { question: { text: 'No answer' }, answer: ' ', others: ['y'] },
            { question: { text: 'Nothing else to pick' }, answer: 'x', others: [] },
            'nonsense',
            question,
          ],
        },
      }),
    ).toEqual({
      2: {
        questions: [
          {
            question: { text: 'How do you order?', translations: { bn: 'কীভাবে', hi: 'कैसे' } },
            answer: 'A coffee, please.',
            others: ['Goodbye.', 'Thank you.'],
          },
          question,
        ],
      },
    })
  })

  it('drops a choice that says the same as the answer or as another choice', () => {
    const kept = parse({
      1: {
        questions: [
          { ...question, others: ['a coffee,  PLEASE.', 'Goodbye.', ' goodbye. ', 'Thank you.'] },
          // With the answer written again as the only other choice, nothing wrong is left to pick.
          { ...question, others: ['A coffee, please.'] },
        ],
      },
    })[1]

    expect(kept?.questions).toEqual([{ ...question, others: ['Goodbye.', 'Thank you.'] }])
  })

  it('drops a week that does not exist or has no usable question', () => {
    expect(
      parse({
        0: quiz,
        51: quiz,
        '07': quiz,
        3: { questions: [] },
        4: { questions: 'nonsense' },
        5: 'nonsense',
        6: quiz,
      }),
    ).toEqual({ 6: quiz })
  })

  it('drops texts that are too long, and whatever is beyond a limit', () => {
    const kept = parse({
      1: {
        questions: [
          { ...question, answer: 'x'.repeat(MAX_QUIZ_CHOICE_LENGTH + 1) },
          { ...question, others: ['One.', 'Two.', 'Three.', 'Four.', 'Five.'] },
          ...Array.from({ length: MAX_QUIZ_QUESTIONS + 2 }, () => question),
        ],
      },
    })[1]

    expect(kept?.questions).toHaveLength(MAX_QUIZ_QUESTIONS)
    expect(kept?.questions[0]?.others).toHaveLength(MAX_QUIZ_OTHERS)
    expect(kept?.questions[1]).toEqual(question)
  })

  it.each([null, 'text', 4, []])('reads %j as "nothing written"', (value) => {
    expect(parse(value)).toEqual({})
  })
})

describe('sameChoice', () => {
  it('takes no notice of capitals or spacing', () => {
    expect(sameChoice(' Good  morning. ', 'good morning.')).toBe(true)
    expect(sameChoice('Good morning.', 'Good morning!')).toBe(false)
  })
})

describe('weekQuiz', () => {
  it('prefers what the admin wrote, then the built-in quiz, then none', () => {
    expect(weekQuiz(1)).toBe(builtInWeekQuizzes[1])
    expect(weekQuiz(1, { 1: quiz })).toBe(quiz)
    expect(weekQuiz(2)).toBeNull()
    expect(weekQuiz(2, { 2: quiz })).toBe(quiz)
  })
})
