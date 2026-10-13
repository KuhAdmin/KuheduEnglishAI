import { DEFAULT_LANGUAGE, primarySubtag } from '../i18n'

/**
 * Reading lesson content back from wherever it was kept, where anything may have been put: the
 * pieces every day's schema shares. They are written once, in `@kuhedu/contracts`, because the
 * server reads what an admin saves with the same ones.
 */
export {
  byLanguage,
  isRecord,
  tidy,
  tidyByLanguage,
  tidyList,
  tidyListByLanguage,
} from '@kuhedu/contracts'

/**
 * Tips for a learner: in their language if it has any (`bn-IN` falls back to `bn`), else in
 * English. `lang` is the language they are written in, for the element that shows them.
 */
export function tipsIn(
  tips: Record<string, string[]>,
  language: string,
): { lang: string; tips: string[] } {
  for (const lang of [language, primarySubtag(language)]) {
    const written = tips[lang]
    if (written) return { lang, tips: written }
  }
  return { lang: DEFAULT_LANGUAGE, tips: tips[DEFAULT_LANGUAGE] ?? [] }
}
