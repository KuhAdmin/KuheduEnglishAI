import type { RouteObject } from 'react-router'
import { paths } from '@/shared/lib/paths'
import { isUnderWay } from './lib/isUnderWay'
import { usePlacementStore } from './store/usePlacementStore'

export { levelLabel } from './lib/levelText'
export type { PlacementResult } from './lib/sessionSchema'
export type { Level, SupportLevel } from './types'

/** The learner's latest placement (starting level, support, skills), or `null` before a test. */
export const usePlacementResult = () => usePlacementStore((state) => state.result)

/**
 * How far this browser's learner has got with the placement test: it has an outcome (`done`),
 * is under way (`started`: begun and not finished, the same test its own screen offers back),
 * or was never begun. Read outside a screen, by the loader that decides where someone opens the
 * app.
 */
export function placementProgress(): 'none' | 'started' | 'done' {
  const { result, session } = usePlacementStore.getState()
  if (result) return 'done'
  return isUnderWay(session) ? 'started' : 'none'
}

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
