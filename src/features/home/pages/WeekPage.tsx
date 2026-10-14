import { ArrowLeft, ArrowRight, Check, ChevronLeft } from 'lucide-react'
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
import { TutorNarrator } from '@/shared/lib/tutor/TutorNarrator'
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
 * once all seven are, it says so and leads on to the next week. That button is the only way on
 * to another week from here; any other week is opened from its section's list. The route's
 * loader has checked the number.
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
  // What the pinned button says; the tutor names it, so the two can never disagree.
  const actionLabel = !weekDone
    ? fillText(t('week.start'), { number: format(nextDay) })
    : number < WEEK_COUNT
      ? fillText(t('week.goToNext'), { number: format(number + 1) })
      : t('week.toJourney')

  return (
    <StepScreen
      // A fresh screen for each week: the next week starts at its top, with its own picture.
      key={number}
      eyebrow={fillText(t('week.position'), { number: format(number), total: format(WEEK_COUNT) })}
      title={t('week.situationHeading')}
      subtitle={week.context}
      subtitleTone="strong"
      topBarTone="soft"
      topBar={
        <div className="flex flex-col pb-4">
          {/* In the part of the screen that does not scroll, and first in it, padded as on Home
              and a section: the tutor is in the same place on every screen. The band around it
              is the top bar's own. */}
          <TutorNarrator
            className="rounded-none px-0"
            cheering={weekDone}
            line={
              weekDone
                ? fillText(t('tutorSays.weekDone'), { number: format(number), button: actionLabel })
                : fillText(t('tutorSays.week'), { day: format(nextDay), button: actionLabel })
            }
            leading={
              <IconButton asChild variant="secondary" label={t('week.back')}>
                <Link to={sectionPath(sectionOfWeek(number))}>
                  <ArrowLeft aria-hidden="true" className="size-6" />
                </Link>
              </IconButton>
            }
          />
          {/* Under the tutor's two rows: the week's place in the course and, at the bar's end as
              on a lesson day, the way back to the day before the one to start, to go through it
              again. Day 1 has nothing before it, and a finished week leads on, not back. Nothing
              else stands beside the bar: an arrow there reads as moving the bar, not as opening
              another week. */}
          <div className="flex items-center gap-3">
            <ProgressBar
              className="flex-1"
              value={number / WEEK_COUNT}
              label={t('week.progressLabel')}
            />
            {!weekDone && nextDay > 1 && (
              <Button
                asChild
                variant="outline"
                size="sm"
                aria-label={fillText(t('lessonDay.previousDayLabel'), {
                  day: format(nextDay - 1),
                })}
              >
                <Link to={lessonDayPath(number, nextDay - 1)}>
                  <ChevronLeft aria-hidden="true" className="-ms-1 size-4" />
                  {fillText(t('lessonDay.previousDay'), { day: format(nextDay - 1) })}
                </Link>
              </Button>
            )}
          </div>
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
                  {actionLabel}
                  <ArrowRight aria-hidden="true" className="size-5" />
                </Link>
              ) : (
                // The last week of the course has no next one.
                <Link to={paths.home}>{actionLabel}</Link>
              )}
            </Button>
          </div>
        ) : (
          <Button asChild size="lg" fullWidth>
            <Link to={lessonDayPath(number, nextDay)}>
              {actionLabel}
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
