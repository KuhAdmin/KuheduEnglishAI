import type { WeekScenarios } from '../weekScenarios'

/**
 * Week 1's real-world challenge: meeting someone for the first time in three other places — a
 * new neighbour in the evening, a colleague on the first day at work, a caller on the phone.
 * Each asks for what the week taught (`dialogues/week1.ts`) in another order, with a step or
 * two beyond it ("Good evening", "Welcome", "You too!").
 * Written by the assistant, with the Bengali and Hindi names and cues. The cues speak of the
 * partner in forms that do not depend on gender ("তাঁকে", "उन्हें"), and of the learner too
 * ("आपका हाल … है" rather than "आप अच्छे / अच्छी हैं"). "My name is …" is left open for the
 * learner's own name.
 * TODO(content): expert review of the English, native review of the names and cues.
 */
export const week1Scenarios: WeekScenarios = {
  scenarios: [
    {
      name: {
        text: 'A new neighbour',
        translations: { bn: 'নতুন প্রতিবেশী', hi: 'नए पड़ोसी' },
      },
      roleplay: {
        partner: 'Priya',
        imageUrl: null,
        turns: [
          {
            partner: 'Hello! Good evening.',
            reply: 'Good evening!',
            cues: { bn: 'তাঁকে শুভ সন্ধ্যা জানান।', hi: 'उन्हें शुभ संध्या कहें।' },
          },
          {
            partner: 'I’m your new neighbour. My name is Priya. What’s your name?',
            reply: 'My name is …',
            cues: { bn: 'নিজের নাম বলুন।', hi: 'अपना नाम बताएँ।' },
          },
          {
            partner: 'Nice to meet you. How are you?',
            reply: 'Nice to meet you too. I’m fine, thank you.',
            cues: {
              bn: 'বলুন, আপনারও পরিচিত হয়ে ভালো লাগল, আর আপনি ভালো আছেন।',
              hi: 'कहें कि आपको भी मिलकर अच्छा लगा, और आपका हाल ठीक है।',
            },
          },
          {
            partner: 'Good. See you later!',
            reply: 'See you later. Goodbye!',
            cues: {
              bn: 'বলুন পরে দেখা হবে, আর বিদায় জানান।',
              hi: 'कहें कि फिर मिलेंगे, और विदा लें।',
            },
          },
        ],
      },
    },
    {
      name: {
        text: 'First day at work',
        translations: { bn: 'কাজের প্রথম দিন', hi: 'काम का पहला दिन' },
      },
      roleplay: {
        partner: 'Sam',
        imageUrl: null,
        turns: [
          {
            partner: 'Good morning! Welcome.',
            reply: 'Good morning! Thank you.',
            cues: {
              bn: 'সুপ্রভাত জানান, আর ধন্যবাদ দিন।',
              hi: 'सुप्रभात कहें, और धन्यवाद दें।',
            },
          },
          {
            partner: 'I’m Sam. What’s your name?',
            reply: 'My name is … Nice to meet you.',
            cues: {
              bn: 'নিজের নাম বলুন, আর বলুন পরিচিত হয়ে ভালো লাগল।',
              hi: 'अपना नाम बताएँ, और कहें कि मिलकर अच्छा लगा।',
            },
          },
          {
            partner: 'Nice to meet you too. How are you today?',
            reply: 'I’m very well, thank you. And you?',
            cues: {
              bn: 'বলুন আপনি খুব ভালো আছেন, ধন্যবাদ দিন, আর তাঁর খবর জিজ্ঞেস করুন।',
              hi: 'कहें कि आपका हाल बहुत अच्छा है, धन्यवाद दें, और उनका हाल पूछें।',
            },
          },
          {
            partner: 'I’m good, thanks. Have a nice day!',
            reply: 'Thank you. You too!',
            cues: {
              bn: 'ধন্যবাদ দিন, আর তাঁকেও একই শুভেচ্ছা জানান।',
              hi: 'धन्यवाद दें, और उन्हें भी यही शुभकामना दें।',
            },
          },
        ],
      },
    },
    {
      name: {
        text: 'A phone call',
        translations: { bn: 'ফোনে কথা', hi: 'फ़ोन पर बात' },
      },
      roleplay: {
        partner: 'Anita',
        imageUrl: null,
        turns: [
          {
            partner: 'Hello?',
            reply: 'Hello! Good afternoon.',
            cues: {
              bn: 'হ্যালো বলুন, আর শুভ অপরাহ্ন জানান।',
              hi: 'हैलो कहें, और शुभ दोपहर कहें।',
            },
          },
          {
            partner: 'Good afternoon! What’s your name, please?',
            reply: 'My name is …',
            cues: { bn: 'নিজের নাম বলুন।', hi: 'अपना नाम बताएँ।' },
          },
          {
            partner: 'Hello! I’m Anita. How are you?',
            reply: 'I’m fine, thank you. And you?',
            cues: {
              bn: 'বলুন আপনি ভালো আছেন, ধন্যবাদ দিন, আর তাঁর খবর জিজ্ঞেস করুন।',
              hi: 'कहें कि आपका हाल ठीक है, धन्यवाद दें, और उनका हाल पूछें।',
            },
          },
          {
            partner: 'I’m good, thanks. Goodbye!',
            reply: 'Goodbye! Have a nice day.',
            cues: {
              bn: 'বিদায় জানান, আর বলুন তাঁর দিনটি ভালো কাটুক।',
              hi: 'विदा लें, और कहें कि उनका दिन अच्छा बीते।',
            },
          },
        ],
      },
    },
  ],
}
