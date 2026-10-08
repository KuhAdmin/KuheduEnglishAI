import type { WeekChallenge } from '../weekChallenges'

/**
 * Week 1's challenge: meeting someone for the first time, from the greeting to the goodbye, in
 * one go. It asks for what Days 1 to 4 taught, and its phrases are lines of the week's
 * conversation (`dialogues/week1.ts`).
 * Written by the assistant, with its Bengali and Hindi. The tasks speak of the other person in
 * forms that do not depend on gender ("তাঁর", "उनका").
 * TODO(content): expert review of the English, native review of the translations.
 */
export const week1Challenge: WeekChallenge = {
  title: {
    text: 'First meeting challenge',
    translations: { bn: 'প্রথম পরিচয়ের চ্যালেঞ্জ', hi: 'पहली मुलाक़ात की चुनौती' },
  },
  instruction: {
    text: 'Meet someone new, from hello to goodbye. Try it on your own.',
    translations: {
      bn: 'নতুন কারও সঙ্গে পরিচিত হন, হ্যালো থেকে বিদায় পর্যন্ত। নিজে নিজে চেষ্টা করুন।',
      hi: 'किसी नए व्यक्ति से मिलें, हैलो से अलविदा तक। ख़ुद कोशिश करें।',
    },
  },
  tasks: [
    {
      text: 'Greet the person',
      translations: { bn: 'শুভেচ্ছা জানান', hi: 'अभिवादन करें' },
    },
    {
      text: 'Ask how they are',
      translations: { bn: 'তিনি কেমন আছেন জিজ্ঞেস করুন', hi: 'उनका हाल पूछें' },
    },
    {
      text: 'Say your name',
      translations: { bn: 'নিজের নাম বলুন', hi: 'अपना नाम बताएँ' },
    },
    {
      text: 'Ask their name',
      translations: { bn: 'তাঁর নাম জিজ্ঞেস করুন', hi: 'उनका नाम पूछें' },
    },
    {
      text: 'Say goodbye',
      translations: { bn: 'বিদায় জানান', hi: 'विदा लें' },
    },
  ],
  phrases: [
    'Hello! Good morning.',
    'How are you?',
    'My name is …',
    'What’s your name?',
    'Nice to meet you.',
    'Goodbye! Have a nice day.',
  ],
}
