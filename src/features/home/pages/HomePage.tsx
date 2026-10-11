import { sectionOfWeek } from '@/shared/lib/curriculum/curriculum'
import { useCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { JourneyTutor } from '../components/JourneyTutor'
import { SectionCard, type SectionStatus } from '../components/SectionCard'
import { useJourneyProgress } from '../lib/journeyProgress'

/**
 * Home: the whole 50-week journey, section by section, with the learner's place in it. The tutor
 * at the top points at that place only; the list is there to be read, not read out.
 */
export function HomePage() {
  const t = useT()
  const language = useLanguage()
  const sections = useCurriculum()
  const { currentWeek, completedSections } = useJourneyProgress()
  const currentSection = sectionOfWeek(currentWeek)
  const current = sections.find((section) => section.section === currentSection)

  const statusOf = (section: number): SectionStatus =>
    section === currentSection
      ? 'current'
      : completedSections.includes(section)
        ? 'completed'
        : 'upcoming'

  return (
    <div className="flex flex-col gap-4">
      {current && (
        <JourneyTutor
          line={fillText(t('tutorSays.home'), {
            number: formatNumber(language, current.section),
            title: current.title,
          })}
        />
      )}

      <header className="flex flex-col gap-1 pb-2 text-center">
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
