import { z } from 'zod'
import type { AgeGroupId } from '../learner/ageGroups'
import { assetUrl, section } from './fields'

/**
 * Profile pictures for the "Tell us about yourself" step, edited in Admin › Profile pictures.
 * Each age group has two images — one male, one female — and the screen alternates between
 * them, so every learner sees someone like themselves.
 */

/** The bundled picture an age group falls back to. */
export const defaultAvatarUrl = (group: AgeGroupId, gender: 'male' | 'female') =>
  `/avatars/${group}-${gender}.svg`

/** Square image, shown in a circle (recommended 256×256). */
const avatarPair = (group: AgeGroupId) =>
  section({
    maleImageUrl: assetUrl.catch(defaultAvatarUrl(group, 'male')),
    femaleImageUrl: assetUrl.catch(defaultAvatarUrl(group, 'female')),
  })

export const profilesConfigSchema = z.object({
  child: avatarPair('child'),
  teen: avatarPair('teen'),
  adult: avatarPair('adult'),
} satisfies Record<AgeGroupId, unknown>)

export type ProfilesConfig = z.infer<typeof profilesConfigSchema>

export const defaultProfilesConfig: ProfilesConfig = profilesConfigSchema.parse({})

export const PROFILES_CONFIG_NAME = 'learner-profiles'
