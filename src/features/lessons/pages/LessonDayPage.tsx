import { useState } from 'react'
import { generatePath, useParams } from 'react-router'
import { useWeekDialogue } from '@/shared/lib/curriculum/weekDialogues'
import { useWeekPictures } from '@/shared/lib/curriculum/weekPictures'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { paths } from '@/shared/lib/paths'
import { LessonNotice } from '../components/LessonNotice'
import { WatchAndListenStep } from '../components/WatchAndListenStep'
import { useLessonStore } from '../store/useLessonStore'

// TODO(lessons): steps 2 to 6 of a day, and what days 2 to 7 hold.
const STEPS_PER_DAY = 6

/**
 * One day of a week's lessons. So far that is the first step of Day 1, "Watch and listen", for
 * weeks that have a conversation; anything else says it is coming. The route's loader has
 * checked the week and the day.
 */
export function LessonDayPage() {
  const t = useT()
  const language = useLanguage()
  const params = useParams()
  const week = Number(params.week)
  const day = Number(params.day)

  const dialogue = useWeekDialogue(week)
  const picture = useWeekPictures()[week] ?? null
  const heardBefore = useLessonStore((state) => state.heardWeeks.includes(week))
  const markHeard = useLessonStore((state) => state.markHeard)
  const [firstStepDone, setFirstStepDone] = useState(false)

  const backTo = generatePath(paths.homeWeek, { week: String(week) })
  const dayTitle = fillText(t('lessonDay.title'), {
    week: formatNumber(language, week),
    day: formatNumber(language, day),
  })

  if (day !== 1 || !dialogue) {
    return <LessonNotice title={dayTitle} subtitle={t('lessonDay.comingSoon')} backTo={backTo} />
  }

  if (firstStepDone) {
    return (
      <LessonNotice
        eyebrow={dayTitle}
        title={t('lessonDay.more.title')}
        subtitle={t('lessonDay.more.subtitle')}
        backTo={backTo}
      />
    )
  }

  return (
    <WatchAndListenStep
      dialogue={dialogue}
      picture={picture}
      step={1}
      stepCount={STEPS_PER_DAY}
      backTo={backTo}
      heardBefore={heardBefore}
      onHeard={() => markHeard(week)}
      onNext={() => setFirstStepDone(true)}
    />
  )
}
