import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { useProfilesConfig } from '@/shared/lib/appConfig/useProfilesConfig'
import { useT } from '@/shared/lib/i18n'
import { ageGroups, DEFAULT_AGE_GROUP, type AgeGroupId } from '@/shared/lib/learner/ageGroups'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { StepScreen } from '@/shared/ui/StepScreen'
import { ProfileAvatar } from '../components/ProfileAvatar'
import { useOnboardingStore } from '../store/useOnboardingStore'

/** Seconds between neighbouring avatars flipping, so they ripple instead of turning together. */
const AVATAR_STAGGER_SECONDS = 0.6

/** The learner says which age group they are in, so examples and situations fit them. */
export function ProfileStepPage() {
  const t = useT()
  const profiles = useProfilesConfig()
  const saved = useOnboardingStore((state) => state.ageGroup)
  const setAgeGroup = useOnboardingStore((state) => state.setAgeGroup)
  const navigate = useNavigate()
  const haptic = useHaptics()

  const [picked, setPicked] = useState<AgeGroupId | null>(null)
  const selected = picked ?? saved ?? DEFAULT_AGE_GROUP

  const handleChange = (ageGroup: AgeGroupId) => {
    haptic('tap')
    setPicked(ageGroup)
  }

  const handleContinue = () => {
    setAgeGroup(selected)
    navigate(paths.onboardingPlacement)
  }

  return (
    <StepScreen
      title={t('onboarding.profile.title')}
      subtitle={t('onboarding.profile.subtitle')}
      footer={
        <Button size="lg" fullWidth onClick={handleContinue}>
          {t('onboarding.continue')}
          <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
        </Button>
      }
    >
      <ChoiceList
        legend={t('onboarding.profile.title')}
        value={selected}
        onChange={handleChange}
        options={ageGroups.map((group, index) => ({
          value: group.id,
          media: (
            <ProfileAvatar
              {...profiles[group.id]}
              // The top avatar is furthest ahead in its cycle, so the flips run down the list.
              phase={(ageGroups.length - 1 - index) * AVATAR_STAGGER_SECONDS}
            />
          ),
          label: t(group.labelKey),
          description: t(group.rangeKey),
        }))}
      />
    </StepScreen>
  )
}
