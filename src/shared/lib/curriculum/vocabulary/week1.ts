import type { WeekVocabulary } from '../weekVocabulary'

/**
 * Week 1's words: the ones Asha and Ravi use in the week's conversation (`dialogues/week1.ts`).
 * Written by the assistant, with broad British-style phonetics and Bengali and Hindi meanings.
 * No pictures ship with them: a greeting is hard to draw, so an admin uploads what fits.
 * TODO(content): expert review of the phonetics, native review of the meanings.
 */
export const week1Vocabulary: WeekVocabulary = {
  words: [
    {
      word: 'hello',
      phonetic: '/həˈləʊ/',
      imageUrl: null,
      meanings: { bn: 'হ্যালো', hi: 'नमस्ते' },
    },
    {
      word: 'good morning',
      phonetic: '/ɡʊd ˈmɔːnɪŋ/',
      imageUrl: null,
      meanings: { bn: 'সুপ্রভাত', hi: 'सुप्रभात' },
    },
    {
      word: 'name',
      phonetic: '/neɪm/',
      imageUrl: null,
      meanings: { bn: 'নাম', hi: 'नाम' },
    },
    {
      word: 'thank you',
      phonetic: '/ˈθæŋk juː/',
      imageUrl: null,
      meanings: { bn: 'ধন্যবাদ', hi: 'धन्यवाद' },
    },
    {
      word: 'nice to meet you',
      phonetic: '/naɪs tə ˈmiːt juː/',
      imageUrl: null,
      meanings: { bn: 'পরিচিত হয়ে ভালো লাগল', hi: 'आपसे मिलकर अच्छा लगा' },
    },
    {
      word: 'goodbye',
      phonetic: '/ɡʊdˈbaɪ/',
      imageUrl: null,
      meanings: { bn: 'বিদায়', hi: 'अलविदा' },
    },
  ],
}
