import { useJourneyProgress } from '@/features/home'
import { useAgeGroup } from '@/features/onboarding'
import { levelLabel, usePlacementResult } from '@/features/placement'
import { useProfilesConfig } from '@/shared/lib/appConfig/useProfilesConfig'
import { WEEK_COUNT } from '@/shared/lib/curriculum/curriculum'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { DEFAULT_AGE_GROUP } from '@/shared/lib/learner/ageGroups'
import { ProfileAvatar } from '@/shared/ui/ProfileAvatar'

/**
 * What the app knows about the learner: the picture of their age group, their starting level
 * once the placement test has been taken, and the week they are on.
 * TODO(auth): their name, and editing it, once learners have accounts.
 */
export function ProfileSummaryCard() {
  const t = useT()
  const language = useLanguage()
  const profiles = useProfilesConfig()
  const ageGroup = useAgeGroup() ?? DEFAULT_AGE_GROUP
  const placement = usePlacementResult()
  const { currentWeek } = useJourneyProgress()

  const week = fillText(t('week.position'), {
    number: formatNumber(language, currentWeek),
    total: formatNumber(language, WEEK_COUNT),
  })
  const level = placement ? levelLabel(t, placement.recommendation.startLevel) : null

  return (
    <section
      aria-label={t('profile.summaryLabel')}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
    >
      <ProfileAvatar {...profiles[ageGroup]} className="size-18 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <p className="text-xl font-extrabold">{level ?? week}</p>
        {level && <p className="text-fg-muted">{week}</p>}
      </div>
    </section>
  )
}
