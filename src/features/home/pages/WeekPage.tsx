import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { sectionOfWeek, WEEK_COUNT } from '@/shared/lib/curriculum/curriculum'
import { useCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { useWeekPictures } from '@/shared/lib/curriculum/weekPictures'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { ScenePicture } from '@/shared/ui/ScenePicture'
import { StepScreen } from '@/shared/ui/StepScreen'
import { OutcomeList } from '../components/OutcomeList'
import { lessonDayPath, sectionPath, weekPath } from '../lib/journeyProgress'

// TODO(lessons): the day the learner has reached, once lessons record progress.
const NEXT_DAY = 1

/**
 * One week in overview: where it sits in the course, its real-life situation and what the
 * learner will be able to do by the end of it. The route's loader has checked the number.
 */
export function WeekPage() {
  const t = useT()
  const language = useLanguage()
  const params = useParams()
  const sections = useCurriculum()
  const pictures = useWeekPictures()

  const number = Number(params.week)
  const week = sections.flatMap((section) => section.weeks).find((entry) => entry.week === number)
  if (!week) return null

  const format = (value: number) => formatNumber(language, value)
  const nextWeek = <ArrowRight aria-hidden="true" className="size-6" />

  return (
    <StepScreen
      // A fresh screen for each week: the next week starts at its top, with its own picture.
      key={number}
      eyebrow={fillText(t('week.position'), { number: format(number), total: format(WEEK_COUNT) })}
      title={t('week.situationHeading')}
      subtitle={week.context}
      subtitleTone="strong"
      topBar={
        <div className="flex items-center gap-2">
          <IconButton asChild label={t('week.back')} className="-ms-2">
            <Link to={sectionPath(sectionOfWeek(number))}>
              <ArrowLeft aria-hidden="true" className="size-6" />
            </Link>
          </IconButton>
          <ProgressBar
            className="flex-1"
            value={number / WEEK_COUNT}
            label={t('week.progressLabel')}
          />
          {number < WEEK_COUNT ? (
            <IconButton asChild label={t('week.next')} className="-me-2">
              <Link to={weekPath(number + 1)}>{nextWeek}</Link>
            </IconButton>
          ) : (
            <IconButton disabled label={t('week.next')} className="-me-2">
              {nextWeek}
            </IconButton>
          )}
        </div>
      }
      footer={
        <Button asChild size="lg" fullWidth>
          <Link to={lessonDayPath(number, NEXT_DAY)}>
            {fillText(t('week.start'), { number: format(NEXT_DAY) })}
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
        </Button>
      }
    >
      <div className="flex animate-rise-in flex-col gap-6">
        <ScenePicture src={pictures[number] ?? null} />
        <OutcomeList label={t('week.outcomesLabel')} outcomes={week.outcomes} />
      </div>
    </StepScreen>
  )
}
