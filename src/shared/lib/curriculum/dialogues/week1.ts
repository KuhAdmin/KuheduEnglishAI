import type { WeekDialogue } from '../weekDialogues'

/**
 * Week 1's conversation: two people meeting for the first time. It uses only what the week
 * teaches — a greeting, a name, asking a name, answering a greeting.
 * Written by the assistant, with its Bengali and Hindi translations. In Hindi, Ravi's question
 * to Asha is in the feminine ("कैसी"), as he is speaking to her.
 * TODO(content): expert review of the English, native review of the translations.
 */
export const week1Dialogue: WeekDialogue = {
  videoUrl: null,
  lines: [
    {
      speaker: 'Asha',
      text: 'Hello! Good morning.',
      translations: { bn: 'হ্যালো! সুপ্রভাত।', hi: 'नमस्ते! सुप्रभात।' },
    },
    {
      speaker: 'Ravi',
      text: 'Good morning! How are you?',
      translations: { bn: 'সুপ্রভাত! আপনি কেমন আছেন?', hi: 'सुप्रभात! आप कैसी हैं?' },
    },
    {
      speaker: 'Asha',
      text: 'I’m fine, thank you. And you?',
      translations: { bn: 'আমি ভালো আছি, ধন্যবাদ। আর আপনি?', hi: 'मैं ठीक हूँ, धन्यवाद। और आप?' },
    },
    {
      speaker: 'Ravi',
      text: 'I’m good, thanks.',
      translations: { bn: 'আমিও ভালো আছি, ধন্যবাদ।', hi: 'मैं भी ठीक हूँ, धन्यवाद।' },
    },
    {
      speaker: 'Asha',
      text: 'My name is Asha. What’s your name?',
      translations: {
        bn: 'আমার নাম আশা। আপনার নাম কী?',
        hi: 'मेरा नाम आशा है। आपका नाम क्या है?',
      },
    },
    {
      speaker: 'Ravi',
      text: 'I’m Ravi. Nice to meet you, Asha.',
      translations: {
        bn: 'আমি রবি। আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল, আশা।',
        hi: 'मैं रवि हूँ। आपसे मिलकर अच्छा लगा, आशा।',
      },
    },
    {
      speaker: 'Asha',
      text: 'Nice to meet you too, Ravi.',
      translations: {
        bn: 'আমারও আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল, রবি।',
        hi: 'मुझे भी आपसे मिलकर अच्छा लगा, रवि।',
      },
    },
    {
      speaker: 'Ravi',
      text: 'See you later. Goodbye!',
      translations: { bn: 'পরে দেখা হবে। বিদায়!', hi: 'फिर मिलेंगे। अलविदा!' },
    },
    {
      speaker: 'Asha',
      text: 'Goodbye! Have a nice day.',
      translations: { bn: 'বিদায়! আপনার দিনটি ভালো কাটুক।', hi: 'अलविदा! आपका दिन शुभ हो।' },
    },
  ],
}
