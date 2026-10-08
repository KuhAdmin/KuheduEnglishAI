import type { WeekSentences } from '../weekSentences'

/**
 * Week 1's sentences to translate and say: five things Asha and Ravi say in the week's
 * conversation (`dialogues/week1.ts`), in the order they come up.
 * Written by the assistant, with their Bengali and Hindi and the tips in all three. The Hindi
 * of "How are you?" is the form used when the other person's gender is not known ("कैसे").
 * Languages are listed in the order the settings schema stores them (bn, en, hi), so that an
 * admin's edit, once undone, leaves nothing to save.
 * TODO(content): expert review of the English and the accepted answers, native review of the
 * translations and tips.
 */
export const week1Sentences: WeekSentences = {
  sentences: [
    {
      english: 'Hello! Good morning.',
      alsoAccepted: ['Hi! Good morning.'],
      translations: { bn: 'হ্যালো! সুপ্রভাত।', hi: 'नमस्ते! सुप्रभात।' },
      tips: {
        bn: ['দুপুরের আগে “Good morning” বলুন।', '“Hello” দিনের যেকোনো সময় বলা যায়।'],
        en: ['Say “Good morning” before noon.', '“Hello” works at any time of day.'],
        hi: ['दोपहर से पहले “Good morning” कहें।', '“Hello” दिन में किसी भी समय कह सकते हैं।'],
      },
    },
    {
      english: 'How are you?',
      alsoAccepted: [],
      translations: { bn: 'আপনি কেমন আছেন?', hi: 'आप कैसे हैं?' },
      tips: {
        bn: [
          'কাউকে শুভেচ্ছা জানানোর পর এটি জিজ্ঞেস করুন।',
          'উত্তরে প্রায়ই বলা হয় “I’m fine, thank you.”',
        ],
        en: ['Ask this after you greet someone.', 'The answer is often “I’m fine, thank you.”'],
        hi: [
          'किसी का अभिवादन करने के बाद यह पूछें।',
          'जवाब में अक्सर “I’m fine, thank you.” कहा जाता है।',
        ],
      },
    },
    {
      english: 'I’m fine, thank you.',
      alsoAccepted: ['I’m fine, thanks.', 'I’m good, thank you.', 'I’m good, thanks.'],
      translations: { bn: 'আমি ভালো আছি, ধন্যবাদ।', hi: 'मैं ठीक हूँ, धन्यवाद।' },
      tips: {
        bn: ['“I’m” (I am) দিয়ে শুরু করুন।', 'ভদ্রতার জন্য শেষে “thank you” বলুন।'],
        en: ['Start with “I’m” (I am).', 'End with “thank you” to be polite.'],
        hi: ['“I’m” (I am) से शुरू करें।', 'विनम्रता के लिए अंत में “thank you” कहें।'],
      },
    },
    {
      english: 'What’s your name?',
      alsoAccepted: [],
      translations: { bn: 'আপনার নাম কী?', hi: 'आपका नाम क्या है?' },
      tips: {
        bn: [
          '“What’s” হলো “What is”-এর সংক্ষিপ্ত রূপ।',
          'উত্তরে বলুন “My name is …” অথবা “I’m …”।',
        ],
        en: ['“What’s” is short for “What is”.', 'Answer with “My name is …” or “I’m …”.'],
        hi: ['“What’s”, “What is” का छोटा रूप है।', 'जवाब में “My name is …” या “I’m …” कहें।'],
      },
    },
    {
      english: 'Nice to meet you.',
      alsoAccepted: ['It’s nice to meet you.', 'Pleased to meet you.', 'Glad to meet you.'],
      translations: {
        bn: 'আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল।',
        hi: 'आपसे मिलकर अच्छा लगा।',
      },
      tips: {
        bn: ['কারও সঙ্গে প্রথমবার দেখা হলে এটি বলুন।', 'উত্তরে বলা হয় “Nice to meet you too.”'],
        en: [
          'Say this when you meet someone for the first time.',
          'The reply is “Nice to meet you too.”',
        ],
        hi: ['किसी से पहली बार मिलने पर यह कहें।', 'जवाब में “Nice to meet you too.” कहा जाता है।'],
      },
    },
  ],
}
