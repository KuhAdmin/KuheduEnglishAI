import { useJourneyProgress } from '@/features/home'
import { useAgeGroup } from '@/features/onboarding'
import { levelLabel, usePlacementResult } from '@/features/placement'
import { useProfilesConfig } from '@/shared/lib/appConfig/useProfilesConfig'
import { WEEK_COUNT } from '@/shared/lib/curriculum/curriculum'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { DEFAULT_AGE_GROUP } from '@/shared/lib/learner/ageGroups'
import { Button } from '@/shared/ui/Button'
import { ProfileAvatar } from '@/shared/ui/ProfileAvatar'
import { useProfilePhoto } from '../hooks/useProfilePhoto'
import { ProfilePhoto } from './ProfilePhoto'

/**
 * What the app knows about the learner: their picture (their own photo, else their Google
 * account's, else the picture of their age group), their starting level once the placement
 * test has been taken, and the week they are on.
 * TODO(learner): their name, and editing it.
 */
export function ProfileSummaryCard() {
  const t = useT()
  const language = useLanguage()
  const profiles = useProfilesConfig()
  const ageGroup = useAgeGroup() ?? DEFAULT_AGE_GROUP
  const placement = usePlacementResult()
  const { currentWeek } = useJourneyProgress()
  const photo = useProfilePhoto()

  const week = fillText(t('week.position'), {
    number: formatNumber(language, currentWeek),
    total: formatNumber(language, WEEK_COUNT),
  })
  const level = placement ? levelLabel(t, placement.recommendation.startLevel) : null

  return (
    <section
      aria-label={t('profile.summaryLabel')}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex items-center gap-5">
        <ProfilePhoto
          src={photo.src}
          busy={photo.busy}
          onChoose={(file) => void photo.choose(file)}
          fallback={<ProfileAvatar {...profiles[ageGroup]} className="size-20" />}
        />
        <div className="flex min-w-0 flex-col">
          <p className="text-xl font-extrabold">{level ?? week}</p>
          {level && <p className="text-fg-muted">{week}</p>}
        </div>
      </div>

      {photo.problem && (
        <p role="alert" className="text-sm font-bold text-danger">
          {t(photo.problem)}
        </p>
      )}
      {/* Their own photo is this browser's only, and theirs to take away again. */}
      {photo.isOwn && (
        <div className="flex flex-col items-start">
          <p className="text-sm text-fg-muted">{t('profile.photo.onThisDevice')}</p>
          {/* Pulled back by its own padding, so its label lines up with the note above it. */}
          <Button variant="ghost" size="sm" className="-ms-3" onClick={photo.remove}>
            {t('profile.photo.remove')}
          </Button>
        </div>
      )}
    </section>
  )
}
