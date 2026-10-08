import { useMemo, useState } from 'react'
import { useLanguagesConfig } from '@/shared/lib/appConfig/useLanguagesConfig'
import { DEFAULT_LANGUAGE } from '@/shared/lib/i18n'

export type EditLanguage = { code: string; name: string }

/**
 * The languages an admin can write wording in, and the one they are writing in now.
 * English comes first (it is the fallback for everything), then the learner languages.
 */
export function useEditLanguage() {
  const { languages } = useLanguagesConfig()

  const options = useMemo(() => {
    const names = new Map<string, string>([[DEFAULT_LANGUAGE, 'English']])
    for (const language of languages) names.set(language.code, language.nativeName)
    return [...names].map(([code, name]): EditLanguage => ({ code, name }))
  }, [languages])

  const [chosen, setLanguage] = useState(DEFAULT_LANGUAGE)
  // A language removed in another tab while it was being edited falls back to English.
  const language = options.some((option) => option.code === chosen) ? chosen : DEFAULT_LANGUAGE

  return { options, language, setLanguage }
}
