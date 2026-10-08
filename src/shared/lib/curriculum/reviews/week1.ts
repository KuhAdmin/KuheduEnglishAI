import type { WeekDialogue } from '../weekDialogues'
import type { WeekRoleplay } from '../weekRoleplays'

/**
 * Week 1's second conversation, for the review's listening practice: two other people meeting,
 * in the afternoon. It says what the week's own conversation (`dialogues/week1.ts`) taught, in
 * another order and with two small steps beyond it ("Hi", "Good afternoon", "very well").
 * Written by the assistant, with its Bengali and Hindi translations. In Hindi, Arjun's question
 * to Meera is in the feminine ("कैसी"), as he is speaking to her, and so is her answer.
 * TODO(content): expert review of the English, native review of the translations.
 */
export const week1ReviewDialogue: WeekDialogue = {
  videoUrl: null,
  lines: [
    {
      speaker: 'Meera',
      text: 'Hi! Good afternoon.',
      translations: { bn: 'হাই! শুভ অপরাহ্ন।', hi: 'हाय! शुभ दोपहर।' },
    },
    {
      speaker: 'Arjun',
      text: 'Good afternoon! How are you?',
      translations: { bn: 'শুভ অপরাহ্ন! আপনি কেমন আছেন?', hi: 'शुभ दोपहर! आप कैसी हैं?' },
    },
    {
      speaker: 'Meera',
      text: 'I’m very well, thank you. And you?',
      translations: {
        bn: 'আমি খুব ভালো আছি, ধন্যবাদ। আর আপনি?',
        hi: 'मैं बहुत अच्छी हूँ, धन्यवाद। और आप?',
      },
    },
    {
      speaker: 'Arjun',
      text: 'I’m fine, thanks.',
      translations: { bn: 'আমি ভালো আছি, ধন্যবাদ।', hi: 'मैं ठीक हूँ, धन्यवाद।' },
    },
    {
      speaker: 'Meera',
      text: 'I’m Meera. What’s your name?',
      translations: { bn: 'আমি মীরা। আপনার নাম কী?', hi: 'मैं मीरा हूँ। आपका नाम क्या है?' },
    },
    {
      speaker: 'Arjun',
      text: 'My name is Arjun. Nice to meet you, Meera.',
      translations: {
        bn: 'আমার নাম অর্জুন। আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল, মীরা।',
        hi: 'मेरा नाम अर्जुन है। आपसे मिलकर अच्छा लगा, मीरा।',
      },
    },
    {
      speaker: 'Meera',
      text: 'Nice to meet you too, Arjun.',
      translations: {
        bn: 'আমারও আপনার সঙ্গে পরিচিত হয়ে ভালো লাগল, অর্জুন।',
        hi: 'मुझे भी आपसे मिलकर अच्छा लगा, अर्जुन।',
      },
    },
    {
      speaker: 'Arjun',
      text: 'Have a nice day. Goodbye!',
      translations: { bn: 'আপনার দিনটি ভালো কাটুক। বিদায়!', hi: 'आपका दिन शुभ हो। अलविदा!' },
    },
    {
      speaker: 'Meera',
      text: 'Goodbye! See you later.',
      translations: { bn: 'বিদায়! পরে দেখা হবে।', hi: 'अलविदा! फिर मिलेंगे।' },
    },
  ],
}

/**
 * Week 1's second role-play, for the review: the learner meets Meera, who starts with her name
 * where Ravi (`roleplays/week1.ts`) started with "How are you?" — the same answers, asked for in
 * another order and two at a time.
 * Written by the assistant, with the Bengali and Hindi cues, which speak of Meera in forms that
 * do not depend on gender ("তাঁকে", "उन्हें").
 * TODO(content): expert review of the English, native review of the cues.
 */
export const week1ReviewRoleplay: WeekRoleplay = {
  partner: 'Meera',
  imageUrl: null,
  turns: [
    {
      partner: 'Hi! Good afternoon.',
      reply: 'Good afternoon!',
      cues: { bn: 'তাঁকে শুভ অপরাহ্ন জানান।', hi: 'उन्हें शुभ दोपहर कहें।' },
    },
    {
      partner: 'I’m Meera. What’s your name?',
      reply: 'My name is …',
      cues: { bn: 'নিজের নাম বলুন।', hi: 'अपना नाम बताएँ।' },
    },
    {
      partner: 'Nice to meet you. How are you?',
      reply: 'Nice to meet you too. I’m fine, thank you.',
      cues: {
        bn: 'বলুন, আপনারও পরিচিত হয়ে ভালো লাগল, আর আপনি ভালো আছেন।',
        hi: 'कहें कि आपको भी मिलकर अच्छा लगा, और आप ठीक हैं।',
      },
    },
    {
      partner: 'Have a nice day. Goodbye!',
      reply: 'Goodbye! See you later.',
      cues: {
        bn: 'বিদায় জানান, আর বলুন পরে দেখা হবে।',
        hi: 'विदा लें, और कहें कि फिर मिलेंगे।',
      },
    },
  ],
}
