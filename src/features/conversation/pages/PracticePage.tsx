import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'

export function PracticePage() {
  const t = useT()
  return <ScreenPlaceholder title={t('practice.title')} description={t('practice.subtitle')} />
}
