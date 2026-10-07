import { createContext, useCallback, useContext } from 'react'
import type { TranslationKey } from './en'
import { useScreenTexts } from './screenTexts'
import { DEFAULT_LANGUAGE, translate } from './translate'

/** The language of the nearest I18nProvider. */
export const I18nContext = createContext<string>(DEFAULT_LANGUAGE)

/** The language the current part of the screen is shown in. */
export function useLanguage(): string {
  return useContext(I18nContext)
}

export type Translate = (key: TranslationKey) => string

/**
 * Returns `t(key)` for the current language. Always call it inside a component — never at
 * module scope — so texts follow the learner's language and an admin's edits immediately.
 */
export function useT(): Translate {
  const language = useLanguage()
  const adminTexts = useScreenTexts()
  return useCallback((key) => translate(language, key, adminTexts), [language, adminTexts])
}
