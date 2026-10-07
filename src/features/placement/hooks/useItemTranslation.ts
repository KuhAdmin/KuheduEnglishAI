import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { isEnglish, primarySubtag, useLanguage } from '@/shared/lib/i18n'
import type { PlacementItem } from '../lib/itemSchema'

export type ItemTranslation = {
  text: string
  /** BCP-47 code of the learner's language, for `lang`. */
  language: string
  /** The language's own name, e.g. "বাংলা". */
  languageName: string
}

/**
 * The question in the learner's own language, when there is one to offer: not for learners who
 * chose English only, and not for questions without a help text in their language.
 */
export function useItemTranslation(item: PlacementItem): ItemTranslation | null {
  const language = useLanguage()
  const { languages } = useLanguagesConfig()
  if (isEnglish(language)) return null

  const text = item.translations?.[language] ?? item.translations?.[primarySubtag(language)]
  if (!text) return null

  const languageName = languages.find((entry) => entry.code === language)?.nativeName ?? language
  return { text, language, languageName }
}
