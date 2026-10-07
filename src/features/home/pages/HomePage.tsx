import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'

export function HomePage() {
  const t = useT()
  return <ScreenPlaceholder title={t('home.title')} description={t('home.subtitle')} />
}
