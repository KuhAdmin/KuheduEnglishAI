import type { SupportLanguage } from '@/shared/lib/appConfig/languagesConfig'
import { primarySubtag } from '@/shared/lib/i18n'

type PickInitialLanguageInput = {
  languages: readonly SupportLanguage[]
  /** What the learner chose before, if anything. */
  saved: string | null
  /** The device's preferred languages (`navigator.languages`). */
  deviceLanguages: readonly string[]
  defaultCode: string
}

/**
 * Which language to pre-select: the learner's earlier choice, else a mother tongue their
 * device is set to, else the admin's default, else the first one offered.
 */
export function pickInitialLanguage({
  languages,
  saved,
  deviceLanguages,
  defaultCode,
}: PickInitialLanguageInput): string | null {
  const has = (code: string | null | undefined) =>
    languages.find((language) => language.code === code)?.code

  const fromDevice = deviceLanguages
    .map(primarySubtag)
    // Most phones are set to English whatever their owner speaks at home, so an English
    // device setting says nothing about the learner's mother tongue.
    .filter((tag) => tag !== 'en')
    .map((tag) => languages.find((language) => primarySubtag(language.code) === tag)?.code)
    .find((code) => code !== undefined)

  return has(saved) ?? fromDevice ?? has(defaultCode) ?? languages[0]?.code ?? null
}
