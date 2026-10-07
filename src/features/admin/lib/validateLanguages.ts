import { languageTag } from '@/shared/lib/appConfig/fields'
import { MAX_LANGUAGES, type SupportLanguage } from '@/shared/lib/appConfig/languagesConfig'
import { adminText } from '../adminText'

export type LanguageRowErrors = { code?: string; nativeName?: string }

export type LanguagesValidation = {
  /** One entry per row, in order; empty object when the row is fine. */
  rows: LanguageRowErrors[]
  /** Problem with the list as a whole. */
  list?: string
  valid: boolean
}

/**
 * Checks the language list before it is saved. The settings schema would silently drop a bad
 * row; an admin should instead be told which row to fix.
 */
export function validateLanguages(languages: readonly SupportLanguage[]): LanguagesValidation {
  const text = adminText.languages
  const codes = languages.map((language) => language.code.trim())

  const rows = languages.map((language, index): LanguageRowErrors => {
    const errors: LanguageRowErrors = {}
    const code = codes[index] ?? ''
    if (!languageTag.safeParse(code).success) errors.code = text.errorCode
    else if (codes.indexOf(code) !== index) errors.code = text.errorDuplicate
    if (!language.nativeName.trim()) errors.nativeName = text.errorName
    return errors
  })

  const list =
    languages.length === 0
      ? text.errorEmpty
      : languages.length > MAX_LANGUAGES
        ? text.errorTooMany
        : undefined

  return { rows, list, valid: !list && rows.every((row) => Object.keys(row).length === 0) }
}
