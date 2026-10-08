import { Headphones, Layers, ListChecks, MessagesSquare, Mic, type LucideIcon } from 'lucide-react'
import type { To } from 'react-router'
import type { ReviewPart, WeekReview } from '@/shared/lib/curriculum/weekReviews'
import { fillText, formatNumber, useLanguage, useT, type TranslationKey } from '@/shared/lib/i18n'
import { StepScreen } from '@/shared/ui/StepScreen'
import { LessonTopBar } from './LessonTopBar'
import { OptionalDayActions } from './OptionalDayActions'
import { ReviewActivityRow } from './ReviewActivityRow'
import { ReviewBadge } from './ReviewBadge'

const icons: Record<ReviewPart, LucideIcon> = {
  quiz: ListChecks,
  listening: Headphones,
  speaking: Mic,
  flashcards: Layers,
  roleplay: MessagesSquare,
}

const titles: Record<ReviewPart, TranslationKey> = {
  quiz: 'lessonDay.review.quiz',
  listening: 'lessonDay.review.listening',
  speaking: 'lessonDay.review.speaking',
  flashcards: 'lessonDay.review.flashcards',
  roleplay: 'lessonDay.review.roleplay',
}

export type ReviewMenuProps = {
  review: WeekReview
  /** The parts the week has something for, in the order to list them. Never empty. */
  parts: readonly ReviewPart[]
  /** The parts the learner has done. */
  done: readonly ReviewPart[]
  /** Where a part opens. */
  hrefOf: (part: ReviewPart) => To
  /** This day's place in the week, e.g. 6 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** Finish the day. Skipping it does the same: the day is optional. */
  onNext: () => void
}

/**
 * Day 6, the week's review: what there is to practise, each a tap away and ticked once done.
 * The upper of its two pinned actions always leads on to the next part not done yet.
 */
export function ReviewMenu({
  review,
  parts,
  done,
  hrefOf,
  day,
  dayCount,
  backTo,
  onNext,
}: ReviewMenuProps) {
  const t = useT()
  const language = useLanguage()

  const about: Record<ReviewPart, string> = {
    quiz: t('lessonDay.review.quizAbout'),
    listening: t('lessonDay.review.listeningAbout'),
    speaking: t('lessonDay.review.speakingAbout'),
    flashcards: fillText(t('lessonDay.review.flashcardsAbout'), {
      count: formatNumber(language, review.flashcards?.words.length ?? 0),
    }),
    roleplay: fillText(t('lessonDay.talk.title'), { name: review.roleplay?.partner ?? '' }),
  }

  const nextPart = parts.find((part) => !done.includes(part))
  const started = parts.some((part) => done.includes(part))

  return (
    <StepScreen
      media={<ReviewBadge />}
      eyebrow={t('lessonDay.optional')}
      title={t('lessonDay.review.title')}
      subtitle={t('lessonDay.review.subtitle')}
      topBar={<LessonTopBar backTo={backTo} day={day} dayCount={dayCount} />}
      footer={
        <OptionalDayActions
          practise={
            nextPart && {
              label: t(started ? 'lessonDay.review.continue' : 'lessonDay.review.start'),
              to: hrefOf(nextPart),
            }
          }
          started={started}
          onNext={onNext}
        />
      }
    >
      <ul
        aria-label={t('lessonDay.review.activities')}
        className="flex animate-rise-in flex-col gap-2"
      >
        {parts.map((part, index) => {
          const Icon = icons[part]
          return (
            <li key={part}>
              <ReviewActivityRow
                to={hrefOf(part)}
                icon={<Icon className="size-6" />}
                tone={index % 2 === 0 ? 'primary' : 'accent'}
                title={t(titles[part])}
                about={about[part]}
                done={done.includes(part)}
                doneLabel={t('lessonDay.done')}
              />
            </li>
          )
        })}
      </ul>
    </StepScreen>
  )
}
