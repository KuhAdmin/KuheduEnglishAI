import type { WeekVocabulary } from '../weekVocabulary'

/**
 * Week 1's words: the ones Asha and Ravi use in the week's conversation (`dialogues/week1.ts`).
 * Written by the assistant, with broad British-style phonetics, Bengali and Hindi meanings, the
 * parts each is said in (as it is spelled, the strong one marked, a final "e" that is not said
 * in brackets) and tips on saying it in all three languages.
 * No pictures ship with them: a greeting is hard to draw, so an admin uploads what fits.
 * Languages are listed in the order the settings schema stores them (bn, en, hi), so that an
 * admin's edit, once undone, leaves nothing to save.
 * TODO(content): expert review of the phonetics, the parts and the tips; native review of the
 * meanings and of the Bengali and Hindi tips.
 */
export const week1Vocabulary: WeekVocabulary = {
  words: [
    {
      word: 'hello',
      phonetic: '/həˈləʊ/',
      imageUrl: null,
      meanings: { bn: 'হ্যালো', hi: 'नमस्ते' },
      syllables: ['hel', 'lo'],
      stress: 2,
      tips: {
        bn: ['দ্বিতীয় অংশটি একটু লম্বা করে, জোর দিয়ে বলুন।', 'প্রথম অংশটি ছোট ও হালকা রাখুন।'],
        en: ['Say the second part longer and louder.', 'Keep the first part short and soft.'],
        hi: ['दूसरा हिस्सा थोड़ा लंबा और ज़ोर से बोलें।', 'पहला हिस्सा छोटा और हल्का रखें।'],
      },
    },
    {
      word: 'good morning',
      phonetic: '/ɡʊd ˈmɔːnɪŋ/',
      imageUrl: null,
      meanings: { bn: 'সুপ্রভাত', hi: 'सुप्रभात' },
      syllables: ['good', 'mor', 'ning'],
      stress: 2,
      tips: {
        bn: ['দুটি শব্দ না থেমে একসঙ্গে বলুন।', '“good” তাড়াতাড়ি বলুন: এর “oo” ছোট।'],
        en: [
          'Say the two words together, without stopping.',
          'Say “good” quickly: its “oo” is short.',
        ],
        hi: ['दोनों शब्द बिना रुके एक साथ बोलें।', '“good” जल्दी बोलें: इसका “oo” छोटा है।'],
      },
    },
    {
      word: 'name',
      phonetic: '/neɪm/',
      imageUrl: null,
      meanings: { bn: 'নাম', hi: 'नाम' },
      syllables: ['nam(e)'],
      stress: null,
      tips: {
        bn: ['“a”-এর উচ্চারণ “এই”-এর মতো।', 'শেষের “e” উচ্চারণ হয় না।'],
        en: ['The “a” sounds like “ay”.', 'The last “e” is not said.'],
        hi: ['“a” की आवाज़ “एइ” जैसी है।', 'आख़िरी “e” बोला नहीं जाता।'],
      },
    },
    {
      word: 'thank you',
      phonetic: '/ˈθæŋk juː/',
      imageUrl: null,
      meanings: { bn: 'ধন্যবাদ', hi: 'धन्यवाद' },
      syllables: ['thank', 'you'],
      stress: 1,
      tips: {
        bn: ['“th” বলতে জিভের ডগা দাঁতের ফাঁকে রাখুন।', 'দুটি শব্দ একসঙ্গে বলুন।'],
        en: [
          'For “th”, put the tip of your tongue between your teeth.',
          'Say the two words together.',
        ],
        hi: ['“th” के लिए जीभ की नोक दाँतों के बीच रखें।', 'दोनों शब्द एक साथ बोलें।'],
      },
    },
    {
      word: 'nice to meet you',
      phonetic: '/naɪs tə ˈmiːt juː/',
      imageUrl: null,
      meanings: { bn: 'পরিচিত হয়ে ভালো লাগল', hi: 'आपसे मिलकर अच्छा लगा' },
      syllables: ['nic(e)', 'to', 'meet', 'you'],
      stress: 3,
      tips: {
        bn: ['“to” ছোট ও হালকা করে বলুন।', '“meet”-এর “ee” লম্বা।'],
        en: ['Say “to” short and soft.', 'The “ee” in “meet” is long.'],
        hi: ['“to” छोटा और हल्का बोलें।', '“meet” का “ee” लंबा है।'],
      },
    },
    {
      word: 'goodbye',
      phonetic: '/ɡʊdˈbaɪ/',
      imageUrl: null,
      meanings: { bn: 'বিদায়', hi: 'अलविदा' },
      syllables: ['good', 'by(e)'],
      stress: 2,
      tips: {
        bn: ['“bye” একটু লম্বা করে, জোর দিয়ে বলুন।', '“bye”-এর উচ্চারণ “my”-এর মতো।'],
        en: ['Say “bye” longer and louder.', '“bye” sounds like “my”.'],
        hi: ['“bye” थोड़ा लंबा और ज़ोर से बोलें।', '“bye” की आवाज़ “my” जैसी है।'],
      },
    },
  ],
}
