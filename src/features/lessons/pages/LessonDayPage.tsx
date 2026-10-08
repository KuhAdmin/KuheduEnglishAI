import { generatePath, useNavigate, useParams } from 'react-router'
import { DAYS_PER_WEEK } from '@/shared/lib/curriculum/curriculum'
import { useWeekChallenge } from '@/shared/lib/curriculum/weekChallenges'
import { useWeekDialogue } from '@/shared/lib/curriculum/weekDialogues'
import { useWeekPictures } from '@/shared/lib/curriculum/weekPictures'
import { useWeekQuiz } from '@/shared/lib/curriculum/weekQuizzes'
import {
  reviewPartsOf,
  useReviewDialogue,
  useReviewRoleplay,
  type WeekReview,
} from '@/shared/lib/curriculum/weekReviews'
import { useWeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { useWeekScenarios } from '@/shared/lib/curriculum/weekScenarios'
import { useWeekSentences } from '@/shared/lib/curriculum/weekSentences'
import { useWeekVocabulary } from '@/shared/lib/curriculum/weekVocabulary'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { useLessonProgressStore } from '@/shared/lib/learner/lessonProgress'
import { paths } from '@/shared/lib/paths'
import { ChallengeStep } from '../components/ChallengeStep'
import { ExtendDay } from '../components/ExtendDay'
import { LearnWordsStep } from '../components/LearnWordsStep'
import { LessonNotice } from '../components/LessonNotice'
import { ReviewDay } from '../components/ReviewDay'
import { RolePlayStep } from '../components/RolePlayStep'
import { TranslateAndSpeakStep } from '../components/TranslateAndSpeakStep'
import { WatchAndListenStep } from '../components/WatchAndListenStep'

/**
 * One day of a week's lessons: one screen, the same for every week, filled with that week's
 * content. Day 1 is "Watch and listen", Day 2 "Learn useful words", Day 3 "Translate and speak",
 * Day 4 a role-play, Day 5 the week's challenge, and two optional days: Day 6 the week's review
 * and Day 7 its real-world challenge. A week without a day's content says it is coming.
 * Finishing a day goes back to the week, whose button then opens the next one. The route's
 * loader has checked the week and the day.
 */
export function LessonDayPage() {
  const t = useT()
  const language = useLanguage()
  const navigate = useNavigate()
  const params = useParams()
  const week = Number(params.week)
  const day = Number(params.day)

  const dialogue = useWeekDialogue(week)
  const vocabulary = useWeekVocabulary(week)
  const sentences = useWeekSentences(week)
  const roleplay = useWeekRoleplay(week)
  const challenge = useWeekChallenge(week)
  const scenarios = useWeekScenarios(week)
  // The review repeats the week's words and its challenge beside what it has of its own.
  const review: WeekReview = {
    quiz: useWeekQuiz(week),
    listening: useReviewDialogue(week),
    speaking: challenge,
    flashcards: vocabulary,
    roleplay: useReviewRoleplay(week),
  }
  const picture = useWeekPictures()[week] ?? null
  const heardBefore = useLessonProgressStore((state) => state.heardWeeks.includes(week))
  const doneBefore = useLessonProgressStore((state) => state.doneDays[week]?.includes(day) ?? false)
  const markHeard = useLessonProgressStore((state) => state.markHeard)
  const markDayDone = useLessonProgressStore((state) => state.markDayDone)

  const backTo = generatePath(paths.homeWeek, { week: String(week) })
  const place = { day, dayCount: DAYS_PER_WEEK, backTo }
  const finishDay = () => {
    markDayDone(week, day)
    void navigate(backTo)
  }

  if (day === 1 && dialogue) {
    return (
      <WatchAndListenStep
        {...place}
        dialogue={dialogue}
        picture={picture}
        heardBefore={heardBefore || doneBefore}
        onHeard={() => markHeard(week)}
        onNext={finishDay}
      />
    )
  }

  if (day === 2 && vocabulary) {
    return (
      <LearnWordsStep
        {...place}
        vocabulary={vocabulary}
        doneBefore={doneBefore}
        onNext={finishDay}
      />
    )
  }

  if (day === 3 && sentences) {
    return (
      <TranslateAndSpeakStep
        {...place}
        sentences={sentences}
        doneBefore={doneBefore}
        onNext={finishDay}
      />
    )
  }

  if (day === 4 && roleplay) {
    return <RolePlayStep {...place} roleplay={roleplay} onNext={finishDay} />
  }

  if (day === 5 && challenge) {
    return (
      <ChallengeStep
        {...place}
        challenge={challenge}
        picture={picture}
        doneBefore={doneBefore}
        onNext={finishDay}
      />
    )
  }

  if (day === 6 && reviewPartsOf(review).length > 0) {
    return <ReviewDay {...place} week={week} review={review} picture={picture} onNext={finishDay} />
  }

  if (day === 7 && scenarios) {
    return (
      <ExtendDay
        {...place}
        week={week}
        scenarios={scenarios}
        picture={picture}
        onNext={finishDay}
      />
    )
  }

  return (
    <LessonNotice
      title={fillText(t('lessonDay.title'), {
        week: formatNumber(language, week),
        day: formatNumber(language, day),
      })}
      subtitle={t('lessonDay.comingSoon')}
      backTo={backTo}
    />
  )
}
