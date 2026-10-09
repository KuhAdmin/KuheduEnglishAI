import { Play, Square } from 'lucide-react'
import { Link } from 'react-router'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { fillText, useT } from '@/shared/lib/i18n'
import {
  tutorAvatars,
  useTutorAvatar,
  useTutorAvatarStore,
  type TutorAvatarId,
} from '@/shared/lib/learner/tutorAvatar'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { TutorAvatar } from '@/shared/ui/TutorAvatar'
import { ProfileSubScreen } from '../components/ProfileSubScreen'
import { useAvatarCheck } from '../hooks/useAvatarCheck'

/**
 * The learner chooses their tutor's face, and can see what it does: "Play a sample" has it say
 * a sentence with its lips moving, then give a thumbs up. Saved on the tap, like the theme.
 * TODO(conversation): the tutor does not appear in lessons yet; this screen is where it is seen.
 */
export function TutorAvatarPage() {
  const t = useT()
  const haptic = useHaptics()
  const avatar = useTutorAvatar()
  const setAvatar = useTutorAvatarStore((state) => state.setAvatar)
  const check = useAvatarCheck()

  const chosen = tutorAvatars.find(({ id }) => id === avatar)

  const handleChange = (id: TutorAvatarId) => {
    haptic('tap')
    setAvatar(id)
  }

  return (
    <ProfileSubScreen
      title={t('tutor.title')}
      subtitle={t('tutor.subtitle')}
      footer={
        <div className="flex flex-col gap-3">
          <p aria-live="polite" className="min-h-6 text-center text-fg-muted">
            {check.failed ? t('tutor.audioFailed') : t('tutor.playHint')}
          </p>
          <Button size="lg" fullWidth onClick={check.toggle}>
            {check.speaking ? (
              <Square aria-hidden="true" className="size-4 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-5 fill-current" />
            )}
            {check.speaking ? t('voice.stop') : t('tutor.play')}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <TutorAvatar
            avatar={avatar}
            mouth={check.mouth}
            mood={check.mood}
            label={chosen ? t(chosen.labelKey) : undefined}
          />
          {/* What the tutor says in the sample: English, so marked as such. */}
          <p lang="en" className="text-center text-balance text-fg-muted">
            {check.sample}
          </p>
        </div>

        <ChoiceList
          className="w-full"
          legend={t('tutor.title')}
          value={avatar}
          onChange={handleChange}
          options={tutorAvatars.map(({ id, labelKey }) => ({
            value: id,
            media: <TutorAvatar avatar={id} size="sm" />,
            label: t(labelKey),
          }))}
        />

        <div className="flex flex-col items-center gap-1">
          {check.voice && (
            <p className="text-center font-bold">
              {fillText(t('tutor.voice'), { name: check.voice.name })}
            </p>
          )}
          <p className="text-center text-balance text-fg-muted">{t('tutor.voiceHint')}</p>
          <Button asChild variant="ghost">
            <Link to={paths.profileVoice}>{t('voice.title')}</Link>
          </Button>
        </div>
      </div>
    </ProfileSubScreen>
  )
}
