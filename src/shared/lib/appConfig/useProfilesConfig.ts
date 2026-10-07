import {
  defaultProfilesConfig,
  PROFILES_CONFIG_NAME,
  profilesConfigSchema,
  type ProfilesConfig,
} from './profilesConfig'
import { useAppConfig } from './useAppConfig'

export function useProfilesConfig(): ProfilesConfig {
  return useAppConfig({
    name: PROFILES_CONFIG_NAME,
    schema: profilesConfigSchema,
    defaults: defaultProfilesConfig,
  })
}
