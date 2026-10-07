import { describe, expect, it } from 'vitest'
import { ageGroups } from '../learner/ageGroups'
import { defaultProfilesConfig, profilesConfigSchema } from './profilesConfig'

describe('profilesConfigSchema', () => {
  it('has a bundled male and female picture for every age group', () => {
    expect(profilesConfigSchema.parse({})).toEqual(defaultProfilesConfig)
    for (const { id } of ageGroups) {
      expect(defaultProfilesConfig[id]).toEqual({
        maleImageUrl: `/avatars/${id}-male.svg`,
        femaleImageUrl: `/avatars/${id}-female.svg`,
      })
    }
  })

  it('uses the pictures an admin uploaded and keeps defaults for the rest', () => {
    const config = profilesConfigSchema.parse({
      adult: {
        maleImageUrl: '/uploads/man.webp',
        femaleImageUrl: 'https://cdn.example.com/w.webp',
      },
      teen: { femaleImageUrl: '/uploads/teen-girl.webp' },
    })

    expect(config.adult).toEqual({
      maleImageUrl: '/uploads/man.webp',
      femaleImageUrl: 'https://cdn.example.com/w.webp',
    })
    expect(config.teen).toEqual({
      maleImageUrl: '/avatars/teen-male.svg',
      femaleImageUrl: '/uploads/teen-girl.webp',
    })
    expect(config.child).toEqual(defaultProfilesConfig.child)
  })

  it('replaces unsafe or malformed image URLs with the bundled picture', () => {
    const config = profilesConfigSchema.parse({
      child: { maleImageUrl: 'javascript:alert(1)', femaleImageUrl: 42 },
    })
    expect(config.child).toEqual(defaultProfilesConfig.child)
  })
})
