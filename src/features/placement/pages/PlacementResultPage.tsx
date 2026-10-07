import { ArrowRight, PartyPopper } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'
import { fillText, useLanguage, useT, type TranslationKey } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'
import { levelLabel, levelPromiseKeys } from '../lib/levelText'
import type { SkillResult } from '../lib/sessionSchema'
import { usePlacementStore } from '../store/usePlacementStore'
import type { Skill } from '../types'

const skillNames = {
  listening: 'placementTest.result.listening',
  understanding: 'placementTest.result.understanding',
  speaking: 'placementTest.result.speaking',
} as const satisfies Record<Skill, TranslationKey>

/**
 * Where the learner starts. Always good news: a starting point, never a score, a percentage or
 * a verdict — and a skill without a level is said to be unscored, not weak.
 */
export function PlacementResultPage() {
  const t = useT()
  const language = useLanguage()
  const navigate = useNavigate()
  const result = usePlacementStore((state) => state.result)
  const start = usePlacementStore((state) => state.start)

  if (!result) return <Navigate to={paths.onboardingPlacement} replace />

  const { profile, recommendation } = result
  const startLevel = recommendation.startLevel

  const skillText = (skill: SkillResult) => {
    if (skill.status === 'assessed') return levelLabel(t, skill.level)
    // "Not yet" is about us (no scoring yet); "not this time" is about this run of the test.
    return t(
      skill.reason === 'notScoredYet'
        ? 'placementTest.result.notScored'
        : 'placementTest.result.notChecked',
    )
  }

  const handleRetake = () => {
    start(language)
    navigate(paths.placementTest)
  }

  return (
    <StepScreen
      title={t('placementTest.result.title')}
      subtitle={fillText(t('placementTest.result.ready'), { level: levelLabel(t, startLevel) })}
      footer={
        <Button asChild size="lg" fullWidth>
          {/* TODO(lessons): open the learning journey at the recommended week and day. */}
          <Link to={paths.home}>
            {t('placementTest.result.start')}
            <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
          </Link>
        </Button>
      }
    >
      <div className="flex animate-rise-in flex-col items-center gap-5">
        <span className="flex size-24 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
          <PartyPopper aria-hidden="true" className="size-12" />
        </span>
        <p className="text-center text-lg">{t(levelPromiseKeys[startLevel])}</p>
        <p className="text-center text-fg-muted">{t('placementTest.result.promise')}</p>

        <details className="w-full rounded-lg bg-surface-sunken">
          <summary className="flex min-h-12 cursor-pointer items-center justify-center px-4 font-bold text-primary">
            {t('placementTest.result.details')}
          </summary>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <dl className="flex flex-col gap-2">
              {(Object.keys(skillNames) as Skill[]).map((skill) => (
                <div
                  key={skill}
                  className="flex items-baseline justify-between gap-3 rounded-md bg-surface px-3 py-2"
                >
                  <dt className="font-bold">{t(skillNames[skill])}</dt>
                  <dd className="text-end text-fg-muted">{skillText(profile[skill])}</dd>
                </div>
              ))}
            </dl>
            {recommendation.provisional && (
              <p className="text-sm text-fg-muted">{t('placementTest.result.basis')}</p>
            )}
            <Button variant="ghost" fullWidth onClick={handleRetake}>
              {t('placementTest.result.retake')}
            </Button>
          </div>
        </details>
      </div>
    </StepScreen>
  )
}
