import { useT } from '@/shared/lib/i18n'
import { ProfileSummaryCard } from '../components/ProfileSummaryCard'
import { SettingsMenu } from '../components/SettingsMenu'

/** Profile: where the learner stands, and the way to each setting. */
export function ProfilePage() {
  const t = useT()

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">
          {t('profile.title')}
        </h1>
        <p className="text-balance text-fg-muted">{t('profile.subtitle')}</p>
      </header>

      <div className="flex animate-rise-in flex-col gap-6">
        <ProfileSummaryCard />
        <SettingsMenu />
      </div>
    </div>
  )
}
