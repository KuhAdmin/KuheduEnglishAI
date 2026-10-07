import type { ReactNode } from 'react'
import { I18nContext } from './I18nContext'

export type I18nProviderProps = {
  /** BCP-47 code. Providers can be nested to show one part of a screen in another language. */
  language: string
  children: ReactNode
}

export function I18nProvider({ language, children }: I18nProviderProps) {
  return <I18nContext value={language}>{children}</I18nContext>
}
