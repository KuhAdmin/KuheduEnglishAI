import { useEffect, type ReactNode } from 'react'
import { I18nProvider } from './I18nProvider'
import { DEFAULT_LANGUAGE } from './translate'
import { useLanguageStore } from './useLanguageStore'

/** App-wide language: the learner's saved choice, or English until they have made one. */
export function AppLanguageProvider({ children }: { children: ReactNode }) {
  const language = useLanguageStore((state) => state.language) ?? DEFAULT_LANGUAGE

  // Screen readers and font selection follow <html lang>.
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return <I18nProvider language={language}>{children}</I18nProvider>
}
