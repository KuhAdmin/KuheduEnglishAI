import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'

// TODO(progress): streaks, XP, session history and review of mistakes.
export function ProgressPage() {
  const t = useT()
  return <ScreenPlaceholder title={t('progress.title')} description={t('progress.subtitle')} />
}
