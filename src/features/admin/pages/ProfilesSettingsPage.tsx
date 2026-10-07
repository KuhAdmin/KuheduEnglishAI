import {
  defaultAvatarUrl,
  defaultProfilesConfig,
  PROFILES_CONFIG_NAME,
  profilesConfigSchema,
  type ProfilesConfig,
} from '@/shared/lib/appConfig/profilesConfig'
import { ageGroups, type AgeGroupId } from '@/shared/lib/learner/ageGroups'
import { adminText } from '../adminText'
import { AdminPage } from '../components/AdminPage'
import { AdminSection } from '../components/AdminSection'
import { ImageField } from '../components/ImageField'
import { useSettingsDraft } from '../hooks/useSettingsDraft'

const text = adminText.profiles
const bounds = { maxWidth: 256, maxHeight: 256 }

/** Edit the male and female picture each age group flips between. */
export function ProfilesSettingsPage() {
  const draft = useSettingsDraft<ProfilesConfig>({
    name: PROFILES_CONFIG_NAME,
    schema: profilesConfigSchema,
    defaults: defaultProfilesConfig,
  })

  const setPicture = (group: AgeGroupId, gender: 'male' | 'female', url: string | null) =>
    draft.update((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [gender === 'male' ? 'maleImageUrl' : 'femaleImageUrl']:
          url ?? defaultAvatarUrl(group, gender),
      },
    }))

  return (
    <AdminPage
      heading={text.heading}
      intro={text.intro}
      isDirty={draft.isDirty}
      isCustomised={draft.isCustomised}
      status={draft.status}
      onSave={draft.save}
      onDiscard={draft.discard}
      onResetToDefaults={draft.resetToDefaults}
    >
      {ageGroups.map(({ id }) => (
        <AdminSection key={id} title={text.groups[id]}>
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageField
              label={`${text.male}: ${text.groups[id]}`}
              hint={text.hint}
              value={draft.value[id].maleImageUrl}
              defaultValue={defaultAvatarUrl(id, 'male')}
              onChange={(url) => setPicture(id, 'male', url)}
              bounds={bounds}
              shape="circle"
            />
            <ImageField
              label={`${text.female}: ${text.groups[id]}`}
              hint={text.hint}
              value={draft.value[id].femaleImageUrl}
              defaultValue={defaultAvatarUrl(id, 'female')}
              onChange={(url) => setPicture(id, 'female', url)}
              bounds={bounds}
              shape="circle"
            />
          </div>
        </AdminSection>
      ))}
    </AdminPage>
  )
}
