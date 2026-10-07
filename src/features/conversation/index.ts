import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'

export const conversationRoutes: RouteObject[] = [
  {
    path: paths.practice,
    lazy: async () => ({ Component: (await import('./pages/PracticePage')).PracticePage }),
  },
]
