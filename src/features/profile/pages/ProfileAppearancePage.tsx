import { useT } from '@/shared/lib/i18n'
import { ProfileSubScreen } from '../components/ProfileSubScreen'
import { ThemeSetting } from '../components/ThemeSetting'

/** The app's color theme. Saved on the tap, so there is no button. */
export function ProfileAppearancePage() {
  const t = useT()

  return (
    <ProfileSubScreen title={t('profile.appearance')} subtitle={t('profile.appearanceHint')}>
      <ThemeSetting />
    </ProfileSubScreen>
  )
}
