import { describe, expect, it } from 'vitest'
import { translationKeys } from '@/shared/lib/i18n'
import { fitWithin } from './imageUpload'
import { groupOfText, groupTextKeys } from './textGroups'
import { toLines, withLanguage } from './lines'
import { validateChallenge } from './validateChallenge'
import { validateDialogue } from './validateDialogue'
import { validateLanguages } from './validateLanguages'
import { validateQuiz } from './validateQuiz'
import { validateRoleplay } from './validateRoleplay'
import { validateScenarios } from './validateScenarios'
import { validateSentences } from './validateSentences'
import { validateVocabulary } from './validateVocabulary'

describe('text groups', () => {
  it('files texts under the screen they appear on', () => {
    expect(groupOfText('onboarding.language.title')).toBe('language')
    expect(groupOfText('ageGroup.child')).toBe('profile')
    expect(groupOfText('onboarding.placement.start')).toBe('placement')
    expect(groupOfText('onboarding.continue')).toBe('onboarding')
    expect(groupOfText('auth.title')).toBe('signIn')
    expect(groupOfText('something.new')).toBe('other')
  })

  it('shows every text exactly once', () => {
    const grouped = groupTextKeys().flatMap((group) => group.keys)
    expect([...grouped].sort()).toEqual([...translationKeys].sort())
  })

  it('has a home for every current text, so "Other" stays empty', () => {
    expect(groupTextKeys().some((group) => group.id === 'other')).toBe(false)
  })
})

describe('validateLanguages', () => {
  const bengali = { code: 'bn', nativeName: 'বাংলা', caption: 'Bengali', flagUrl: null }

  it('accepts a normal list', () => {
    const result = validateLanguages([
      bengali,
      { ...bengali, code: 'en-IN', nativeName: 'English' },
    ])
    expect(result.valid).toBe(true)
    expect(result.rows).toEqual([{}, {}])
  })

  it('points at the row and field to fix', () => {
    const result = validateLanguages([
      bengali,
      { ...bengali, nativeName: '  ' },
      { ...bengali, code: 'Not A Code', nativeName: 'X' },
    ])
    expect(result.valid).toBe(false)
    expect(result.rows[0]).toEqual({})
    expect(result.rows[1]).toEqual({
      code: 'This code is already used by another language.',
      nativeName: 'Enter the language name.',
    })
    expect(result.rows[2]).toEqual({ code: 'Use a short code such as bn or en-IN.' })
  })

  it('needs at least one language and at most the maximum', () => {
    expect(validateLanguages([]).list).toBe('Keep at least one language.')
    const many = Array.from({ length: 31 }, (_, index) => ({
      ...bengali,
      code: `x${String.fromCharCode(97 + (index % 26))}${index > 25 ? 'a' : ''}`,
    }))
    expect(validateLanguages(many).list).toBe('That is the maximum number of languages.')
  })
})

describe('fitWithin', () => {
  it('shrinks to fit while keeping the proportions', () => {
    expect(fitWithin(4000, 2000, { maxWidth: 1000, maxHeight: 1000 })).toEqual({
      width: 1000,
      height: 500,
    })
    expect(fitWithin(1000, 4000, { maxWidth: 1080, maxHeight: 1920 })).toEqual({
      width: 480,
      height: 1920,
    })
  })

  it('never enlarges a small image', () => {
    expect(fitWithin(64, 48, { maxWidth: 256, maxHeight: 256 })).toEqual({ width: 64, height: 48 })
  })
})

describe('validateDialogue', () => {
  const line = { speaker: 'Asha', text: 'Hello!', translations: {} }

  it('accepts a conversation, with or without a video link', () => {
    expect(validateDialogue({ videoUrl: null, lines: [line] }).valid).toBe(true)
    expect(
      validateDialogue({ videoUrl: 'https://cdn.example.com/week1.mp4', lines: [line] }).valid,
    ).toBe(true)
    // No conversation at all is nothing to fix.
    expect(validateDialogue({ videoUrl: null, lines: [] }).valid).toBe(true)
  })

  it('points at the line that is unfinished', () => {
    const result = validateDialogue({
      videoUrl: null,
      lines: [line, { speaker: ' ', text: '', translations: {} }],
    })
    expect(result.valid).toBe(false)
    expect(result.lines).toEqual([
      {},
      { speaker: 'Enter who says this.', text: 'Enter what they say.' },
    ])
  })

  it('refuses a video link that is not https, and a video without its conversation', () => {
    for (const videoUrl of [
      'http://example.com/a.mp4',
      'javascript:alert(1)',
      'data:video/mp4;base64,AAAA',
    ]) {
      expect(validateDialogue({ videoUrl, lines: [line] })).toMatchObject({
        valid: false,
        video: 'Use a link that starts with https://',
      })
    }
    expect(validateDialogue({ videoUrl: 'https://example.com/a.mp4', lines: [] })).toMatchObject({
      valid: false,
      list: 'Add the conversation the video shows: at least one line.',
    })
  })

  it('refuses more lines than a conversation may have', () => {
    const lines = Array.from({ length: 17 }, () => line)
    expect(validateDialogue({ videoUrl: null, lines }).list).toBe(
      'That is the maximum number of lines.',
    )
  })
})

describe('validateVocabulary', () => {
  const word = (text: string) => ({ word: text, phonetic: '', imageUrl: null, meanings: {} })

  it('accepts a list of different words, and an empty list', () => {
    expect(validateVocabulary({ words: [word('hello'), word('goodbye')] }).valid).toBe(true)
    expect(validateVocabulary({ words: [] }).valid).toBe(true)
  })

  it('points at an entry without a word, and at a word that is there twice', () => {
    const result = validateVocabulary({ words: [word('hello'), word('  '), word(' Hello ')] })
    expect(result.valid).toBe(false)
    expect(result.words).toEqual([
      {},
      { word: 'Enter the word.' },
      { word: 'This word is already in the list.' },
    ])
  })

  it('refuses more words than a screen may hold', () => {
    const words = Array.from({ length: 9 }, (_, index) => word(`word ${index}`))
    expect(validateVocabulary({ words }).list).toBe('That is the maximum number of words.')
  })
})

describe('validateSentences', () => {
  const sentence = (english: string) => ({ english, alsoAccepted: [], translations: {}, tips: {} })

  it('accepts sentences that have their English, and an empty list', () => {
    expect(validateSentences({ sentences: [sentence('Hello.'), sentence('Hello.')] }).valid).toBe(
      true,
    )
    expect(validateSentences({ sentences: [] }).valid).toBe(true)
  })

  it('points at the sentence without its English', () => {
    const result = validateSentences({ sentences: [sentence('Hello.'), sentence('  ')] })
    expect(result.valid).toBe(false)
    expect(result.sentences).toEqual([{}, { english: 'Enter the sentence in English.' }])
  })

  it('refuses more sentences than a day may have', () => {
    const sentences = Array.from({ length: 7 }, (_, index) => sentence(`Sentence ${index}.`))
    expect(validateSentences({ sentences }).list).toBe('That is the maximum number of sentences.')
  })
})

describe('validateRoleplay', () => {
  const turn = { partner: 'How are you?', reply: 'I’m fine, thank you.', cues: {} }
  const roleplay = { partner: 'Ravi', imageUrl: null, turns: [turn] }

  it('accepts a role-play with a partner and whole turns, and a week with none at all', () => {
    expect(validateRoleplay(roleplay).valid).toBe(true)
    expect(validateRoleplay({ partner: ' ', imageUrl: null, turns: [] }).valid).toBe(true)
  })

  it('points at the turn that lacks a line', () => {
    const result = validateRoleplay({
      ...roleplay,
      turns: [turn, { partner: ' ', reply: '', cues: {} }, { ...turn, reply: '' }],
    })
    expect(result.valid).toBe(false)
    expect(result.turns).toEqual([
      {},
      { partner: 'Enter what the partner says.', reply: 'Enter a reply the learner could give.' },
      { reply: 'Enter a reply the learner could give.' },
    ])
  })

  it('wants a partner for the turns, and turns for a partner or a picture', () => {
    expect(validateRoleplay({ ...roleplay, partner: '' })).toMatchObject({
      valid: false,
      partner: 'Enter who the learner talks to.',
    })
    expect(validateRoleplay({ ...roleplay, turns: [] })).toMatchObject({
      valid: false,
      list: 'Add what is said: at least one turn.',
    })
    expect(
      validateRoleplay({ partner: '', imageUrl: '/people/ravi.webp', turns: [] }),
    ).toMatchObject({ valid: false, partner: 'Enter who the learner talks to.' })
  })

  it('refuses more turns than a role-play may have', () => {
    const turns = Array.from({ length: 9 }, () => turn)
    expect(validateRoleplay({ ...roleplay, turns }).list).toBe(
      'That is the maximum number of turns.',
    )
  })
})

describe('validateChallenge', () => {
  const blank = { text: '', translations: {} }
  const task = { text: 'Greet the staff', translations: {} }
  const challenge = {
    title: { text: 'Café challenge', translations: {} },
    instruction: blank,
    tasks: [task],
    phrases: [],
  }

  it('accepts a challenge with a name and tasks, and a week with none at all', () => {
    expect(validateChallenge(challenge).valid).toBe(true)
    expect(validateChallenge({ ...challenge, title: blank, tasks: [] }).valid).toBe(true)
  })

  it('points at the task that is not written in English', () => {
    const result = validateChallenge({
      ...challenge,
      tasks: [task, { text: ' ', translations: { bn: 'শুধু বাংলা' } }],
    })
    expect(result.valid).toBe(false)
    expect(result.tasks).toEqual([{}, { text: 'Enter what to do.' }])
  })

  it('wants a name for the tasks, and tasks for anything else that was written', () => {
    expect(validateChallenge({ ...challenge, title: blank })).toMatchObject({
      valid: false,
      title: 'Enter the name of the challenge.',
    })
    expect(validateChallenge({ ...challenge, tasks: [] })).toMatchObject({
      valid: false,
      list: 'Add what to do: at least one task.',
    })
    // A name in another language, or a phrase, is something written too.
    for (const started of [
      { title: { text: '', translations: { bn: 'ক্যাফে' } } },
      { phrases: ['Hello!'] },
    ]) {
      expect(
        validateChallenge({ ...challenge, title: blank, tasks: [], ...started }),
      ).toMatchObject({ valid: false, title: 'Enter the name of the challenge.' })
    }
  })

  it('refuses more tasks than a challenge may have', () => {
    const tasks = Array.from({ length: 7 }, () => task)
    expect(validateChallenge({ ...challenge, tasks }).list).toBe(
      'That is the maximum number of tasks.',
    )
  })
})

describe('validateQuiz', () => {
  const question = {
    question: { text: 'How do you order a coffee?', translations: {} },
    answer: 'A coffee, please.',
    others: ['Goodbye.', 'Thank you.'],
  }

  it('accepts questions with an answer and another choice, and a week with no quiz at all', () => {
    expect(validateQuiz({ questions: [question, question] }).valid).toBe(true)
    expect(validateQuiz({ questions: [] }).valid).toBe(true)
    // A line left blank while typing is not a choice yet, and not a fault either.
    expect(validateQuiz({ questions: [{ ...question, others: ['Goodbye.', ''] }] }).valid).toBe(
      true,
    )
  })

  it('points at the question and the field to fix', () => {
    const result = validateQuiz({
      questions: [
        question,
        { question: { text: ' ', translations: { bn: 'শুধু বাংলা' } }, answer: '', others: [' '] },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.questions).toEqual([
      {},
      {
        question: 'Enter what is asked.',
        answer: 'Enter the right answer.',
        others: 'Enter at least one other choice.',
      },
    ])
  })

  it('refuses a choice that says the same as the answer or as another choice', () => {
    const same = 'A choice is the same as the right answer, or is listed twice.'
    expect(
      validateQuiz({ questions: [{ ...question, others: ['Goodbye.', 'a coffee,  PLEASE.'] }] })
        .questions[0],
    ).toEqual({ others: same })
    expect(
      validateQuiz({ questions: [{ ...question, others: ['Goodbye.', ' goodbye. '] }] })
        .questions[0],
    ).toEqual({ others: same })
  })

  it('refuses more questions than a quiz may have', () => {
    const questions = Array.from({ length: 9 }, () => question)
    expect(validateQuiz({ questions }).list).toBe('That is the maximum number of questions.')
  })
})

describe('validateScenarios', () => {
  const roleplay = {
    partner: 'the barista',
    imageUrl: null,
    turns: [{ partner: 'What would you like?', reply: 'A coffee, please.', cues: {} }],
  }
  const scenario = { name: { text: 'Takeaway café', translations: {} }, roleplay }

  it('accepts named scenarios that can be played, and a week with none at all', () => {
    expect(validateScenarios({ scenarios: [scenario, scenario] }).valid).toBe(true)
    expect(validateScenarios({ scenarios: [] }).valid).toBe(true)
  })

  it('wants an English name, and a role-play: a scenario without one is unfinished, not absent', () => {
    const result = validateScenarios({
      scenarios: [
        scenario,
        {
          name: { text: ' ', translations: { bn: 'শুধু বাংলা' } },
          roleplay: { partner: '', imageUrl: null, turns: [] },
        },
      ],
    })

    expect(result.valid).toBe(false)
    expect(result.scenarios[0]).toMatchObject({ name: undefined, roleplay: { valid: true } })
    expect(result.scenarios[1]).toMatchObject({
      name: 'Enter the name of the scenario.',
      roleplay: {
        valid: false,
        partner: 'Enter who the learner talks to.',
        list: 'Add what is said: at least one turn.',
      },
    })
  })

  it('points at what is wrong inside a scenario’s role-play, as Day 4’s editor would', () => {
    const result = validateScenarios({
      scenarios: [
        {
          ...scenario,
          roleplay: { ...roleplay, turns: [{ partner: 'Hello!', reply: ' ', cues: {} }] },
        },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.scenarios[0]?.roleplay.turns).toEqual([
      { reply: 'Enter a reply the learner could give.' },
    ])
  })

  it('refuses more scenarios than a week may have', () => {
    const scenarios = Array.from({ length: 4 }, () => scenario)
    expect(validateScenarios({ scenarios }).list).toBe('That is the maximum number of scenarios.')
  })
})

describe('fields that hold a list or a language’s entry', () => {
  it('reads one item per line, cut to its limits, with nothing for an empty field', () => {
    expect(toLines('one\ntwo\n', 3, 10)).toEqual(['one', 'two', ''])
    expect(toLines('one\ntwo\nthree\nfour', 3, 10)).toEqual(['one', 'two', 'three'])
    expect(toLines('a very long line', 3, 6)).toEqual(['a very'])
    expect(toLines('', 3, 10)).toEqual([])
  })

  it('sets and clears an entry, keeping the languages in the stored order', () => {
    expect(Object.keys(withLanguage({ hi: 'x', bn: 'y' }, 'en', 'z'))).toEqual(['bn', 'en', 'hi'])
    expect(withLanguage({ bn: 'y', hi: 'x' }, 'hi', undefined)).toEqual({ bn: 'y' })
  })
})
