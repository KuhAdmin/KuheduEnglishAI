import { useEffect, useId, useRef } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { cn } from '@/shared/lib/cn'
import { challengeText } from '@/shared/lib/curriculum/weekChallenges'
import type { WeekQuiz } from '@/shared/lib/curriculum/weekQuizzes'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useQuiz } from '../hooks/useQuiz'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'
import { QuizFeedback } from './QuizFeedback'
import { ReviewPartDone } from './ReviewPartDone'

export type QuizStepProps = {
  quiz: WeekQuiz
  /** This day's place in the week, e.g. 6 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the review's list. */
  backTo: string
  backLabel: string
  /** The quiz is over, and the learner goes on. */
  onNext: () => void
}

/**
 * The quick quiz of a week's review: one question at a time, read in the learner's language,
 * answered by picking an English choice and checking it. A right answer gets a tick; a wrong one
 * is shown the answer, and comes back once after the others. Nothing is locked but "Check",
 * which needs a choice.
 */
export function QuizStep({ quiz, day, dayCount, backTo, backLabel, onNext }: QuizStepProps) {
  const t = useT()
  const language = useLanguage()
  const haptic = useHaptics()
  const playback = useSpeechPlayback()
  const run = useQuiz(quiz.questions)
  const hintId = useId()

  // The screen stays while the question changes; moving focus to the question announces it.
  const asking = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (run.turn > 0) asking.current?.focus()
  }, [run.turn])

  const format = (value: number) => formatNumber(language, value)
  const topBar = (
    <LessonTopBar backTo={backTo} backLabel={backLabel} day={day} dayCount={dayCount} />
  )

  const { question } = run
  if (!question) {
    return (
      <ReviewPartDone
        title={t('lessonDay.quiz.doneTitle')}
        subtitle={fillText(t('lessonDay.quiz.score'), {
          right: format(run.rightFirstTime),
          total: format(run.total),
        })}
        topBar={topBar}
        againLabel={t('lessonDay.quiz.retry')}
        onAgain={run.restart}
        onNext={onNext}
      />
    )
  }

  const asked = challengeText(question.question, language)
  const canCheck = run.picked !== null

  return (
    <StepScreen
      eyebrow={
        run.again
          ? t('lessonDay.quiz.again')
          : fillText(t('lessonDay.quiz.place'), {
              current: format(run.place),
              total: format(run.total),
            })
      }
      title={t('lessonDay.review.quiz')}
      topBar={topBar}
      footer={
        <div className="flex flex-col gap-3">
          {/* Always there, so that what the answer came to is announced. */}
          <div role="status" className="empty:hidden">
            {run.checked && (
              <QuizFeedback
                right={run.right}
                answer={question.answer}
                onPlay={isSpeechSupported() ? () => void playback.play(question.answer) : undefined}
              />
            )}
          </div>
          {run.checked ? (
            <LessonNextButton
              lockedBecause={null}
              onNext={() => {
                playback.stop()
                run.next()
              }}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p id={hintId} className="text-center text-sm text-fg-muted">
                {canCheck ? null : t('lessonDay.quiz.pickFirst')}
              </p>
              <Button
                size="lg"
                fullWidth
                disabled={!canCheck}
                aria-describedby={canCheck ? undefined : hintId}
                onClick={() => {
                  if (run.check()) haptic('success')
                }}
              >
                {t('lessonDay.quiz.check')}
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div
        key={run.turn}
        className={cn(
          'flex flex-col gap-4',
          run.turn === 0 ? 'animate-rise-in' : 'animate-fade-in',
        )}
      >
        <h2
          ref={asking}
          tabIndex={-1}
          lang={asked.lang}
          className="text-center text-xl font-extrabold text-balance outline-none"
        >
          {asked.text}
        </h2>
        <ChoiceList
          legend={asked.text}
          options={run.choices.map((choice) => ({
            value: choice,
            label: <span lang="en">{choice}</span>,
          }))}
          value={run.picked}
          onChange={run.pick}
          disabled={run.checked}
        />
      </div>
    </StepScreen>
  )
}
