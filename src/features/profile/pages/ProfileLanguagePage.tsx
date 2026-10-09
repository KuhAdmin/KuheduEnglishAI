import { useT } from '@/shared/lib/i18n'
import { LanguageSetting } from '../components/LanguageSetting'
import { ProfileSubScreen } from '../components/ProfileSubScreen'

/** The learner's language, changed after onboarding. Saved on the tap, so there is no button. */
export function ProfileLanguagePage() {
  const t = useT()

  return (
    <ProfileSubScreen title={t('profile.language')} subtitle={t('profile.languageHint')}>
      <LanguageSetting />
    </ProfileSubScreen>
  )
}
