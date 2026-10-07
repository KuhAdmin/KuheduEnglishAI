import {
  ArrowRight,
  BookOpen,
  Clock,
  Headphones,
  Mic,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { isEnglish, useLanguage, useT, type TranslationKey } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'

type Skill = {
  id: string
  icon: LucideIcon
  labelKey: TranslationKey
  /** Only tested when the learner has a mother tongue to translate from. */
  needsMotherTongue?: boolean
}

const skills: Skill[] = [
  { id: 'listen', icon: Headphones, labelKey: 'onboarding.placement.listen' },
  { id: 'understand', icon: BookOpen, labelKey: 'onboarding.placement.understand' },
  { id: 'speak', icon: Mic, labelKey: 'onboarding.placement.speak' },
  {
    id: 'translate',
    icon: PenLine,
    labelKey: 'onboarding.placement.translate',
    needsMotherTongue: true,
  },
]

/** Explains the placement test before it starts: what it covers and how long it takes. */
export function PlacementIntroPage() {
  const t = useT()
  const englishOnly = isEnglish(useLanguage())
  const shownSkills = skills.filter((skill) => !(skill.needsMotherTongue && englishOnly))

  return (
    <StepScreen
      title={t('onboarding.placement.title')}
      subtitle={t('onboarding.placement.subtitle')}
      footer={
        <div className="flex flex-col gap-3">
          <p className="flex items-center justify-center gap-2 rounded-full bg-surface-sunken px-4 py-3 font-bold text-fg-muted">
            <Clock aria-hidden="true" className="size-5" />
            {t('onboarding.placement.duration')}
          </p>
          <Button asChild size="lg" fullWidth>
            <Link to={paths.placementTest}>
              {t('onboarding.placement.start')}
              <ArrowRight aria-hidden="true" className="size-5" strokeWidth={2.5} />
            </Link>
          </Button>
        </div>
      }
    >
      <ul aria-label={t('onboarding.placement.skillsLabel')} className="flex flex-col gap-4 px-2">
        {shownSkills.map(({ id, icon: Icon, labelKey }) => (
          <li key={id} className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-on-primary-soft">
              <Icon aria-hidden="true" className="size-6" />
            </span>
            <span className="text-lg font-bold">{t(labelKey)}</span>
          </li>
        ))}
      </ul>
    </StepScreen>
  )
}
