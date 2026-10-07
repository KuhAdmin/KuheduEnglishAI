import { Outlet } from 'react-router'
import { useApplyTheme } from '@/shared/theme'
import { usePwaUpdate } from '../pwa/usePwaUpdate'

/**
 * Outermost shell: applies the theme and registers the service worker. It draws nothing itself;
 * learner screens sit in PhoneLayout, the admin area in its own wider layout.
 */
export function RootLayout() {
  useApplyTheme()
  // TODO(ui-ux): surface `needRefresh` / `offlineReady` through the Toast component.
  usePwaUpdate()

  return <Outlet />
}
