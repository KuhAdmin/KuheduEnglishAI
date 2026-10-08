import type { WeekRoleplay } from '../weekRoleplays'

/**
 * Week 1's role-play: the learner meets Ravi for the first time and answers as themselves. It
 * follows the week's conversation (`dialogues/week1.ts`) with the learner in Asha's place, so
 * every reply is something they have heard, learnt and translated on Days 1 to 3.
 * Written by the assistant, with the Bengali and Hindi cues. The cues speak of Ravi in forms
 * that do not depend on gender ("তাঁকে", "उनका"). "My name is …" is left open for the learner's
 * own name; the device's voice reads it as far as "is".
 * TODO(content): expert review of the English, native review of the cues.
 */
export const week1Roleplay: WeekRoleplay = {
  partner: 'Ravi',
  imageUrl: null,
  turns: [
    {
      partner: 'Hello! Good morning.',
      reply: 'Good morning!',
      cues: { bn: 'তাঁকে সুপ্রভাত জানান।', hi: 'उन्हें सुप्रभात कहें।' },
    },
    {
      partner: 'How are you?',
      reply: 'I’m fine, thank you. And you?',
      cues: {
        bn: 'বলুন আপনি ভালো আছেন, ধন্যবাদ দিন, আর তাঁর খবর জিজ্ঞেস করুন।',
        hi: 'कहें कि आप ठीक हैं, धन्यवाद दें, और उनका हाल पूछें।',
      },
    },
    {
      partner: 'I’m good, thanks. My name is Ravi. What’s your name?',
      reply: 'My name is …',
      cues: { bn: 'নিজের নাম বলুন।', hi: 'अपना नाम बताएँ।' },
    },
    {
      partner: 'Nice to meet you.',
      reply: 'Nice to meet you too.',
      cues: {
        bn: 'বলুন, আপনারও তাঁর সঙ্গে পরিচিত হয়ে ভালো লাগল।',
        hi: 'कहें कि आपको भी उनसे मिलकर अच्छा लगा।',
      },
    },
    {
      partner: 'See you later. Goodbye!',
      reply: 'Goodbye! Have a nice day.',
      cues: {
        bn: 'বিদায় জানান, আর বলুন তাঁর দিনটি ভালো কাটুক।',
        hi: 'विदा लें, और कहें कि उनका दिन अच्छा बीते।',
      },
    },
  ],
}
