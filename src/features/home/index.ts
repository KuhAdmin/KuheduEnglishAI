import type { RouteObject } from 'react-router'
import { isSectionNumber, isWeekNumber } from '@/shared/lib/curriculum/curriculum'
import { ensureWeekContent } from '@/shared/lib/curriculum/weekContentRemote'
import { paths } from '@/shared/lib/paths'

export { useJourneyProgress } from './lib/journeyProgress'

export const homeRoutes: RouteObject[] = [
  {
    path: paths.home,
    lazy: async () => ({ Component: (await import('./pages/HomePage')).HomePage }),
  },
  {
    path: paths.homeSection,
    // A section that does not exist is a page that does not exist.
    loader: ({ params }) => {
      if (!isSectionNumber(Number(params.section))) throw new Response(null, { status: 404 })
      return null
    },
    lazy: async () => ({ Component: (await import('./pages/SectionPage')).SectionPage }),
  },
]

/** Full-screen, without the bottom navigation: a week's overview has its own pinned action. */
export const weekRoutes: RouteObject[] = [
  {
    path: paths.homeWeek,
    loader: async ({ params }) => {
      if (!isWeekNumber(Number(params.week))) throw new Response(null, { status: 404 })
      // The week's picture, and its days' content for when they are opened, as the server has it.
      await ensureWeekContent(Number(params.week))
      return null
    },
    lazy: async () => ({ Component: (await import('./pages/WeekPage')).WeekPage }),
  },
]
