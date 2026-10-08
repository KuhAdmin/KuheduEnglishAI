import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { sectionOfWeek, WEEK_COUNT } from '@/shared/lib/curriculum/curriculum'
import { useCurriculum } from '@/shared/lib/curriculum/useCurriculum'
import { useWeekPictures } from '@/shared/lib/curriculum/weekPictures'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import {
  isWeekDone,
  nextLessonDay,
  useLessonProgressStore,
} from '@/shared/lib/learner/lessonProgress'
import { paths } from '@/shared/lib/paths'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { ProgressBar } from '@/shared/ui/ProgressBar'
import { ScenePicture } from '@/shared/ui/ScenePicture'
import { StepScreen } from '@/shared/ui/StepScreen'
import { OutcomeList } from '../components/OutcomeList'
import { lessonDayPath, sectionPath, weekPath } from '../lib/journeyProgress'

/**
 * One week in overview: where it sits in the course, its real-life situation and what the
 * learner will be able to do by the end of it. Its button opens the first day not finished yet;
 * once all seven are, it says so and leads on to the next week. The route's loader has checked
 * the number.
 * TODO(lessons): a list of the week's days, to open a finished one again.
 */
export function WeekPage() {
  const t = useT()
  const language = useLanguage()
  const params = useParams()
  const sections = useCurriculum()
  const pictures = useWeekPictures()

  const number = Number(params.week)
  // The first day of this week the learner has not finished: the button opens that one.
  const nextDay = useLessonProgressStore((state) => nextLessonDay(state.doneDays[number]))
  const weekDone = useLessonProgressStore((state) => isWeekDone(state.doneDays[number]))
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
        weekDone ? (
          <div className="flex flex-col gap-3">
            <p className="flex items-center justify-center gap-2 text-center font-extrabold">
              {/* The words say it; the tick only adds to them. */}
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              {t('week.complete')}
            </p>
            <Button asChild size="lg" fullWidth>
              {number < WEEK_COUNT ? (
                <Link to={weekPath(number + 1)}>
                  {fillText(t('week.goToNext'), { number: format(number + 1) })}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              ) : (
                // The last week of the course has no next one.
                <Link to={paths.home}>{t('week.toJourney')}</Link>
              )}
            </Button>
          </div>
        ) : (
          <Button asChild size="lg" fullWidth>
            <Link to={lessonDayPath(number, nextDay)}>
              {fillText(t('week.start'), { number: format(nextDay) })}
              <ArrowRight aria-hidden="true" className="size-5" />
            </Link>
          </Button>
        )
      }
    >
      <div className="flex animate-rise-in flex-col gap-6">
        <ScenePicture src={pictures[number] ?? null} />
        <OutcomeList label={t('week.outcomesLabel')} outcomes={week.outcomes} />
      </div>
    </StepScreen>
  )
}
