import {
  defaultLandingConfig,
  LANDING_CONFIG_NAME,
  landingConfigSchema,
  type LandingConfig,
} from './landingConfig'
import { useAppConfig } from './useAppConfig'

export function useLandingConfig(): LandingConfig {
  return useAppConfig({
    name: LANDING_CONFIG_NAME,
    schema: landingConfigSchema,
    defaults: defaultLandingConfig,
  })
}
