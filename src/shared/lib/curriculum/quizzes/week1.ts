import type { WeekQuiz } from '../weekQuizzes'

/**
 * Week 1's quiz: which of the week's expressions fits the moment. Every choice is a line the
 * learner has met on Days 1 to 5 (`dialogues/week1.ts`), so a wrong one is still good English,
 * only for another moment.
 * Written by the assistant, with its Bengali and Hindi. The Hindi questions ask "… कैसे करें?",
 * "… क्या कहें?", which do not depend on the learner's gender.
 * TODO(content): expert review of the English, native review of the translations.
 */
export const week1Quiz: WeekQuiz = {
  questions: [
    {
      question: {
        text: 'It is morning. How do you greet someone?',
        translations: {
          bn: 'এখন সকাল। কাউকে কীভাবে শুভেচ্ছা জানাবেন?',
          hi: 'अभी सुबह है। किसी का अभिवादन कैसे करें?',
        },
      },
      answer: 'Good morning.',
      others: ['Goodbye.', 'Thank you.'],
    },
    {
      question: {
        text: 'Someone asks, “How are you?” What do you say?',
        translations: {
          bn: 'কেউ জিজ্ঞেস করলেন, “How are you?” আপনি কী বলবেন?',
          hi: 'कोई पूछे, “How are you?” तो क्या कहें?',
        },
      },
      answer: 'I’m fine, thank you.',
      others: ['My name is Asha.', 'Nice to meet you.'],
    },
    {
      question: {
        text: 'How do you ask someone’s name?',
        translations: {
          bn: 'কারও নাম কীভাবে জিজ্ঞেস করবেন?',
          hi: 'किसी का नाम कैसे पूछें?',
        },
      },
      answer: 'What’s your name?',
      others: ['How are you?', 'See you later.'],
    },
    {
      question: {
        text: 'You meet someone for the first time. What do you say?',
        translations: {
          bn: 'কারও সঙ্গে প্রথমবার দেখা হলে কী বলবেন?',
          hi: 'किसी से पहली बार मिलने पर क्या कहें?',
        },
      },
      answer: 'Nice to meet you.',
      others: ['See you later.', 'Have a nice day.'],
    },
    {
      question: {
        text: 'You are leaving. What do you say?',
        translations: {
          bn: 'চলে যাওয়ার সময় কী বলবেন?',
          hi: 'जाते समय क्या कहें?',
        },
      },
      answer: 'Goodbye! Have a nice day.',
      others: ['Hello! Good morning.', 'What’s your name?'],
    },
  ],
}
