import { sectionOfWeek } from '@/shared/lib/curriculum/curriculum'
import { useCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { useT } from '@/shared/lib/i18n'
import { SectionCard, type SectionStatus } from '../components/SectionCard'
import { useJourneyProgress } from '../lib/journeyProgress'

/** Home: the whole 50-week journey, section by section, with the learner's place in it. */
export function HomePage() {
  const t = useT()
  const sections = useCurriculum()
  const { currentWeek, completedSections } = useJourneyProgress()
  const currentSection = sectionOfWeek(currentWeek)

  const statusOf = (section: number): SectionStatus =>
    section === currentSection
      ? 'current'
      : completedSections.includes(section)
        ? 'completed'
        : 'upcoming'

  return (
    <div className="flex flex-col gap-6 pt-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">{t('home.title')}</h1>
        <p className="text-balance text-fg-muted">{t('home.subtitle')}</p>
      </header>

      <ol aria-label={t('journey.sectionsLabel')} className="flex animate-rise-in flex-col gap-3">
        {sections.map((section) => (
          <li key={section.section}>
            <SectionCard section={section} status={statusOf(section.section)} />
          </li>
        ))}
      </ol>
    </div>
  )
}
