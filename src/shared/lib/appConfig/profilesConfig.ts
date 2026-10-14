/**
 * Profile pictures for the "Tell us about yourself" step, edited in Admin › Profile pictures.
 * The schema is written once, in `@kuhedu/contracts`, because the server checks what an admin
 * saves by it.
 */
export {
  defaultAvatarUrl,
  defaultProfilesConfig,
  PROFILES_CONFIG_NAME,
  profilesConfigSchema,
  type ProfilesConfig,
} from '@kuhedu/contracts'
