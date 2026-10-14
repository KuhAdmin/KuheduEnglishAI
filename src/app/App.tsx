import { RouterProvider } from 'react-router/dom'
import { loadSession } from '@/shared/lib/account'
import { startAppConfig } from '@/shared/lib/appConfig/appConfigRemote'
import { startLessonContent } from '@/shared/lib/curriculum/weekContentRemote'
import { startLearnerSync } from '@/shared/lib/learnerData/learnerSync'
import { AppProviders } from './providers/AppProviders'
import { createAppRouter } from './router'

// The lessons are kept on the server: a week is fetched when it is opened.
startLessonContent()
// So is everything else an admin manages (landing page, languages, screen texts, …): fetched as
// the first screen opens.
startAppConfig()
// What a learner sets and does is kept with their account. This follows who is signed in, so
// it is listening before that is asked.
startLearnerSync()
// Asked as the app starts, not when a screen first needs it: who is signed in is the server's
// to say, and nothing of it is kept in the browser.
void loadSession()
// Made last: a router runs the first screen's loaders as it is made, and a lesson opened by its
// own address would otherwise ask for its week before the lessons were being fetched at all.
const router = createAppRouter()

export function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
