import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'
import { ThemeSetting } from '../components/ThemeSetting'

export function ProfilePage() {
  const t = useT()

  return (
    <div className="flex flex-col gap-2 pb-8">
      {/* TODO(ui-ux): real profile header, progress and settings list. */}
      <ScreenPlaceholder title={t('profile.title')} description={t('profile.subtitle')} />

      <section aria-labelledby="appearance-heading" className="flex flex-col gap-3">
        <h2 id="appearance-heading" className="text-xl font-extrabold">
          {t('profile.appearance')}
        </h2>
        <ThemeSetting />
      </section>
    </div>
  )
}
