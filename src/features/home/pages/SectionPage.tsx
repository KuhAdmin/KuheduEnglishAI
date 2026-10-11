import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { useCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { IconButton } from '@/shared/ui/IconButton'
import { JourneyTutor } from '../components/JourneyTutor'
import { WeekCard } from '../components/WeekCard'
import { useJourneyProgress } from '../lib/journeyProgress'

/** One section of the journey: its five weeks. The route's loader has checked the number. */
export function SectionPage() {
  const t = useT()
  const language = useLanguage()
  const params = useParams()
  const sections = useCurriculum()
  const { currentWeek } = useJourneyProgress()

  const section = sections.find((entry) => entry.section === Number(params.section))
  if (!section) return null

  const number = (value: number) => formatNumber(language, value)
  // The week the learner is on, where it is one of this section's: the one thing to point at.
  const thisWeek = section.weeks.find((week) => week.week === currentWeek)

  return (
    <div className="flex flex-col gap-5">
      <JourneyTutor
        line={
          thisWeek
            ? fillText(t('tutorSays.sectionCurrent'), {
                number: number(thisWeek.week),
                situation: thisWeek.context,
              })
            : fillText(t('tutorSays.section'), {
                from: number(section.firstWeek),
                to: number(section.lastWeek),
              })
        }
        // In the tutor's band, which does not scroll: the way back is always in reach.
        leading={
          <IconButton asChild variant="secondary" label={t('journey.back')}>
            <Link to={paths.home}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
        }
      />

      <header className="flex flex-col gap-1">
        <p className="text-sm font-extrabold text-primary">
          {fillText(t('journey.section'), { number: number(section.section) })}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance">{section.title}</h1>
        <p className="text-fg-muted">
          {fillText(t('journey.weekRange'), {
            from: number(section.firstWeek),
            to: number(section.lastWeek),
          })}
        </p>
      </header>

      <ol aria-label={t('journey.weeksLabel')} className="flex animate-rise-in flex-col gap-3">
        {section.weeks.map((week) => (
          <li key={week.week}>
            <WeekCard week={week} current={week.week === currentWeek} />
          </li>
        ))}
      </ol>
    </div>
  )
}
