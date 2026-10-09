import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { ScreenPlaceholder } from '@/shared/ui/ScreenPlaceholder'
import { PhoneFrame } from '../layouts/PhoneFrame'

// TODO(ui-ux): replace with the ErrorState / EmptyState components.
export function RouteError() {
  const t = useT()
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  // Drawn where the screen that failed would have been: in the phone frame.
  if (notFound) {
    return (
      <PhoneFrame>
        <div className="pt-safe px-gutter">
          <ScreenPlaceholder title={t('notFound.title')} description={t('notFound.body')}>
            <Link
              to={paths.landing}
              className="inline-flex touch-target items-center font-bold text-primary"
            >
              {t('notFound.home')}
            </Link>
          </ScreenPlaceholder>
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <div className="pt-safe px-gutter">
        <ScreenPlaceholder title={t('error.title')} description={t('error.body')}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex touch-target items-center self-start font-bold text-primary"
          >
            {t('error.retry')}
          </button>
        </ScreenPlaceholder>
      </div>
    </PhoneFrame>
  )
}
