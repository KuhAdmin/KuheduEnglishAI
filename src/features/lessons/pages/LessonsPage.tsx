import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'

export function LessonsPage() {
  const t = useT()
  return <ScreenPlaceholder title={t('lessons.title')} description={t('lessons.subtitle')} />
}
