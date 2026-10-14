/**
 * Landing-page settings, edited in Admin › Landing page. The schema is written once, in
 * `@kuhedu/contracts`, because the server checks what an admin saves by it.
 */
export {
  defaultLandingConfig,
  LANDING_CONFIG_NAME,
  landingConfigSchema,
  landingDefaults,
  MAX_HEADLINES,
  type LandingConfig,
  type LandingHeadline,
} from '@kuhedu/contracts'
