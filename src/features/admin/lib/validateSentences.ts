import { MAX_SENTENCES, type WeekSentences } from '@/shared/lib/curriculum/weekSentences'
import { adminText } from '../adminText'

export type SentenceErrors = { english?: string }

export type SentencesValidation = {
  /** One entry per sentence, in order; empty object when the sentence is fine. */
  sentences: SentenceErrors[]
  /** Problem with the list as a whole. */
  list?: string
  valid: boolean
}

/**
 * Checks a week's sentences before they are saved. The settings schema would silently drop an
 * entry without its English; an admin should instead be told which one to fix. Everything else
 * about a sentence is optional, and the fields themselves keep its lists within their limits.
 */
export function validateSentences(content: WeekSentences): SentencesValidation {
  const text = adminText.lessons

  const sentences = content.sentences.map((sentence): SentenceErrors =>
    sentence.english.trim() ? {} : { english: text.errorSentence },
  )
  const list = content.sentences.length > MAX_SENTENCES ? text.errorTooManySentences : undefined

  return {
    sentences,
    list,
    valid: !list && sentences.every((entry) => Object.keys(entry).length === 0),
  }
}
