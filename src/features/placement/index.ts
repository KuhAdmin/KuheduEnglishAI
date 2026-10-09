import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'
import { usePlacementStore } from './store/usePlacementStore'

export { levelLabel } from './lib/levelText'
export type { PlacementResult } from './lib/sessionSchema'
export type { Level, SupportLevel } from './types'

/** The learner's latest placement (starting level, support, skills), or `null` before a test. */
export const usePlacementResult = () => usePlacementStore((state) => state.result)

export const placementRoutes: RouteObject[] = [
  {
    path: paths.placementTest,
    lazy: async () => ({
      Component: (await import('./pages/PlacementTestPage')).PlacementTestPage,
    }),
  },
  {
    path: paths.placementResult,
    lazy: async () => ({
      Component: (await import('./pages/PlacementResultPage')).PlacementResultPage,
    }),
  },
]
