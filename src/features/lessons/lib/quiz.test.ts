import { describe, expect, it } from 'vitest'
import { quizChoices } from './quiz'

const question = {
  question: { text: 'How do you greet someone in the morning?', translations: {} },
  answer: 'Good morning.',
  others: ['Goodbye.', 'Thank you.'],
}

describe('quizChoices', () => {
  it('shows the answer among the others, each choice once', () => {
    for (let turn = 0; turn < 6; turn += 1) {
      expect([...quizChoices(question, turn)].sort()).toEqual([
        'Good morning.',
        'Goodbye.',
        'Thank you.',
      ])
    }
  })

  it('keeps the others in the order they were written', () => {
    const others = quizChoices(question, 1).filter((choice) => choice !== question.answer)
    expect(others).toEqual(question.others)
  })

  it('moves the answer from one showing to the next, through every place', () => {
    const places = [0, 1, 2].map((turn) => quizChoices(question, turn).indexOf(question.answer))
    expect([...places].sort()).toEqual([0, 1, 2])
  })

  it('draws the same question on the same turn the same way every time', () => {
    expect(quizChoices(question, 4)).toEqual(quizChoices(question, 4))
  })

  it('does not put every answer in the same place on the same turn', () => {
    const longer = { ...question, answer: 'Good morning!!' }
    expect(quizChoices(longer, 0).indexOf(longer.answer)).not.toBe(
      quizChoices(question, 0).indexOf(question.answer),
    )
  })
})
