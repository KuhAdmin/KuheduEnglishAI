import { describe, expect, it } from 'vitest'
import { matchesAnswer, normaliseAnswer } from './matchAnswer'

describe('normaliseAnswer', () => {
  it('leaves only the words: no capitals, punctuation or extra spaces', () => {
    expect(normaliseAnswer('  Hello!   Good  MORNING. ')).toBe('hello good morning')
    expect(normaliseAnswer('Nice to meet you, Asha…')).toBe('nice to meet you asha')
  })

  it.each([
    ['I’m fine.', 'i am fine'],
    ["I'm fine", 'i am fine'],
    ['What’s your name?', 'what is your name'],
    ['I’d like a coffee, please.', 'i would like a coffee please'],
    ['We’re here; they’ve gone and she’ll call.', 'we are here they have gone and she will call'],
    ['I don’t know. It isn’t far.', 'i do not know it is not far'],
    ['I can’t. I cannot. I won’t.', 'i can not i can not i will not'],
    ['Let’s go.', 'let us go'],
  ])('writes the short forms of %j out', (text, words) => {
    expect(normaliseAnswer(text)).toBe(words)
  })

  it('does not take a name’s “’s” for “is”', () => {
    expect(normaliseAnswer('This is Asha’s bag.')).toBe('this is asha s bag')
  })
})

describe('matchesAnswer', () => {
  const accepted = ['I’m fine, thank you.', 'I’m fine, thanks.']

  it.each([
    'I’m fine, thank you.',
    "i'm fine thank you",
    'I am fine, thank you!',
    'I AM FINE, THANKS',
  ])('takes %j for one of the accepted sentences', (typed) => {
    expect(matchesAnswer(typed, accepted)).toBe(true)
  })

  it.each(['I am good, thank you.', 'I’m fine', 'fine thank you', '', '   ', '?!'])(
    'does not recognise %j',
    (typed) => {
      expect(matchesAnswer(typed, accepted)).toBe(false)
    },
  )
})
