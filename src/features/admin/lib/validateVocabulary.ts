import { MAX_VOCABULARY_WORDS, type WeekVocabulary } from '@/shared/lib/curriculum/weekVocabulary'
import { adminText } from '../adminText'

export type VocabularyWordErrors = { word?: string }

export type VocabularyValidation = {
  /** One entry per word, in order; empty object when the word is fine. */
  words: VocabularyWordErrors[]
  /** Problem with the list as a whole. */
  list?: string
  valid: boolean
}

/**
 * Checks a week's words before they are saved. The settings schema would silently drop an entry
 * without a word; an admin should instead be told which one to fix. A word may appear only once:
 * the learner's screen tells the words apart by their text.
 */
export function validateVocabulary(vocabulary: WeekVocabulary): VocabularyValidation {
  const text = adminText.lessons
  const written = vocabulary.words.map((entry) => entry.word.trim().toLowerCase())

  const words = written.map((word, index): VocabularyWordErrors => {
    if (!word) return { word: text.errorWord }
    return written.indexOf(word) === index ? {} : { word: text.errorDuplicateWord }
  })

  const list = vocabulary.words.length > MAX_VOCABULARY_WORDS ? text.errorTooManyWords : undefined

  return { words, list, valid: !list && words.every((entry) => Object.keys(entry).length === 0) }
}
