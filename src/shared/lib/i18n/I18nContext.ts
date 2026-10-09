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
  return useTFor(useLanguage())
}

/**
 * `t(key)` for a language other than the screen's own: for a text that is content in that
 * language, like the sentence a Bengali voice says as its sample.
 */
export function useTFor(language: string): Translate {
  const adminTexts = useScreenTexts()
  return useCallback((key) => translate(language, key, adminTexts), [language, adminTexts])
}
