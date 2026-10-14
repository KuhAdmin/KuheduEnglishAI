/**
 * Languages a learner can choose from, edited in Admin › Languages. The schema is written once,
 * in `@kuhedu/contracts`, because the server checks what an admin saves by it.
 */
export {
  defaultLanguagesConfig,
  LANGUAGES_CONFIG_NAME,
  languagesConfigSchema,
  languageSchema,
  MAX_LANGUAGES,
  type LanguagesConfig,
  type SupportLanguage,
} from '@kuhedu/contracts'
