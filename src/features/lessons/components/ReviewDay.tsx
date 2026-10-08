import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  reviewPartsOf,
  type ReviewPart,
  type WeekReview,
} from '@/shared/lib/curriculum/weekReviews'
import { useT } from '@/shared/lib/i18n'
import { useLessonProgressStore } from '@/shared/lib/learner/lessonProgress'
import { ChallengeStep } from './ChallengeStep'
import { FlashcardsStep } from './FlashcardsStep'
import { QuizStep } from './QuizStep'
import { ReviewMenu } from './ReviewMenu'
import { RolePlayStep } from './RolePlayStep'
import { WatchAndListenStep } from './WatchAndListenStep'

/** Which part of the review is open is kept in the address, so the phone's Back closes it. */
const PART_PARAM = 'part'

const nothingDone: readonly ReviewPart[] = []

export type ReviewDayProps = {
  week: number
  /** What the week has for each part; at least one part has something. */
  review: WeekReview
  /** The picture of the week's situation, if an admin uploaded one. */
  picture: string | null
  /** This day's place in the week, e.g. 6 of 7. */
  day: number
  dayCount: number
  /** Where the list's back arrow leads: the week's overview. */
  backTo: string
  /** Finish the day. */
  onNext: () => void
}

/**
 * Day 6, the week's review: a list of things to practise, and whichever of them is open. Three
 * of the five are screens of earlier days given other content or the same again — listening is
 * Day 1's screen, speaking Day 5's, the mini role-play Day 4's — so only the quiz and the
 * flashcards are screens of their own. Finishing a part ticks it and returns to the list.
 */
export function ReviewDay({
  week,
  review,
  picture,
  day,
  dayCount,
  backTo,
  onNext,
}: ReviewDayProps) {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const done = useLessonProgressStore((state) => state.reviewParts[week]) ?? nothingDone
  const markDone = useLessonProgressStore((state) => state.markReviewPartDone)
  // The review's conversation heard through, this time round.
  const [heard, setHeard] = useState(false)

  const parts = reviewPartsOf(review)
  const asked = params.get(PART_PARAM)
  // A part the week has nothing for, or no part at all, is the list.
  const open = parts.find((part) => part === asked)

  const finish = (part: ReviewPart) => () => {
    markDone(week, part)
    void navigate(pathname, { replace: true })
  }
  const inPart = { day, dayCount, backTo: pathname, backLabel: t('lessonDay.review.back') }

  if (open === 'quiz' && review.quiz) {
    return <QuizStep {...inPart} quiz={review.quiz} onNext={finish('quiz')} />
  }

  if (open === 'listening' && review.listening) {
    return (
      <WatchAndListenStep
        {...inPart}
        title={t('lessonDay.review.listening')}
        subtitle={t('lessonDay.review.listeningSubtitle')}
        dialogue={review.listening}
        picture={picture}
        heardBefore={heard || done.includes('listening')}
        onHeard={() => setHeard(true)}
        onNext={finish('listening')}
      />
    )
  }

  if (open === 'speaking' && review.speaking) {
    return (
      <ChallengeStep
        {...inPart}
        challenge={review.speaking}
        picture={picture}
        doneBefore={done.includes('speaking')}
        onNext={finish('speaking')}
      />
    )
  }

  if (open === 'flashcards' && review.flashcards) {
    return (
      <FlashcardsStep {...inPart} vocabulary={review.flashcards} onNext={finish('flashcards')} />
    )
  }

  if (open === 'roleplay' && review.roleplay) {
    return (
      <RolePlayStep
        {...inPart}
        endNote={t('lessonDay.review.endChat')}
        roleplay={review.roleplay}
        onNext={finish('roleplay')}
      />
    )
  }

  return (
    <ReviewMenu
      review={review}
      parts={parts}
      done={done}
      hrefOf={(part) => ({ search: `?${PART_PARAM}=${part}` })}
      day={day}
      dayCount={dayCount}
      backTo={backTo}
      onNext={onNext}
    />
  )
}
