import { useT } from '@/shared/lib/i18n'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'

// TODO(placement-test): the adaptive test itself.
export function PlacementTestPage() {
  const t = useT()
  return (
    <ScreenPlaceholder title={t('placementTest.title')} description={t('placementTest.subtitle')} />
  )
}
