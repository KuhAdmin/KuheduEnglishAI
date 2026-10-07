import { cn } from '@/shared/lib/cn'
import { useT, type TranslationKey } from '@/shared/lib/i18n'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { MAX_SPEAK_PROMPTS, MAX_STAGE_ITEMS } from '../lib/engine'
import type { PlacementSession } from '../lib/sessionSchema'
import { STAGES, type Stage } from '../types'

const stageNames = {
  LISTEN: 'onboarding.placement.listen',
  UNDERSTAND: 'onboarding.placement.understand',
  SPEAK: 'onboarding.placement.speak',
} as const satisfies Record<Stage, TranslationKey>

/** How full a stage's bar is. The test adapts, so this is "about how far", never "3 of 7". */
function stageFraction(session: PlacementSession, stage: Stage): number {
  const position = STAGES.indexOf(stage) - STAGES.indexOf(session.stage)
  if (session.status === 'COMPLETED' || position < 0) return 1
  if (position > 0) return 0

  const answered = session.responses.filter((response) => response.stage === stage).length
  const expected = stage === 'SPEAK' ? MAX_SPEAK_PROMPTS : MAX_STAGE_ITEMS
  // Never quite full while the stage is still going: it may end sooner or later than expected.
  return Math.min(0.9, answered / expected)
}

/** The three parts of the test, with the current one marked by more than color. */
export function StageProgress({ session }: { session: PlacementSession }) {
  const t = useT()

  return (
    <ol aria-label={t('placementTest.progress')} className="flex min-w-0 flex-1 gap-2">
      {STAGES.map((stage) => {
        const current = stage === session.stage && session.status !== 'COMPLETED'
        const name = t(stageNames[stage])
        return (
          <li
            key={stage}
            aria-current={current ? 'step' : undefined}
            className="flex min-w-0 flex-1 flex-col gap-1"
          >
            <ProgressBar value={stageFraction(session, stage)} label={name} />
            <span
              aria-hidden="true"
              className={cn(
                'truncate text-center text-sm',
                current ? 'font-extrabold text-fg' : 'text-fg-subtle',
              )}
            >
              {name}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
