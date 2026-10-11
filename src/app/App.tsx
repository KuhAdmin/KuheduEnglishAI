import { RouterProvider } from 'react-router/dom'
import { loadSession } from '@/shared/lib/account'
import { AppProviders } from './providers/AppProviders'
import { router } from './router'

// Asked as the app starts, not when a screen first needs it: who is signed in is the server's
// to say, and nothing of it is kept in the browser.
void loadSession()

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
