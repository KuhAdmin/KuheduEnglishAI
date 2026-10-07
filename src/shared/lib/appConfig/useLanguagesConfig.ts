import {
  defaultLanguagesConfig,
  LANGUAGES_CONFIG_NAME,
  languagesConfigSchema,
  type LanguagesConfig,
} from './languagesConfig'
import { useAppConfig } from './useAppConfig'

export function useLanguagesConfig(): LanguagesConfig {
  return useAppConfig({
    name: LANGUAGES_CONFIG_NAME,
    schema: languagesConfigSchema,
    defaults: defaultLanguagesConfig,
  })
}
