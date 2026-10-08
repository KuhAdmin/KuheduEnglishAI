import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { translationLength } from '@/shared/lib/curriculum/weekChallenges'
import {
  MAX_QUIZ_CHOICE_LENGTH,
  MAX_QUIZ_OTHERS,
  MAX_QUIZ_QUESTION_LENGTH,
  type QuizQuestion,
} from '@/shared/lib/curriculum/weekQuizzes'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { toLines, withLanguage } from '../lib/lines'
import type { QuizQuestionErrors } from '../lib/validateQuiz'

const text = adminText.lessons

export type QuizQuestionFieldsProps = {
  /** Position in the quiz, from 0. */
  index: number
  /** How many questions the quiz has. */
  count: number
  question: QuizQuestion
  errors: QuizQuestionErrors | undefined
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (question: QuizQuestion) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/**
 * One question of a quiz: what is asked (in English and in the language being written), the
 * right answer, and the other choices.
 */
export function QuizQuestionFields({
  index,
  count,
  question,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: QuizQuestionFieldsProps) {
  const name = `${text.question} ${index + 1}`
  // Every question has the same fields; its number tells them apart for assistive technology.
  const named = (label: string) => (
    <>
      {label} <span className="sr-only">({name})</span>
    </>
  )
  const asked = question.question

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveQuestionUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveQuestionDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.removeQuestion} ${index + 1}`}
            // The last question goes with the quiz itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={named(text.questionText)}
          lang="en"
          value={asked.text}
          error={errors?.question}
          maxLength={MAX_QUIZ_QUESTION_LENGTH}
          onChange={(event) =>
            onChange({ ...question, question: { ...asked, text: event.target.value } })
          }
        />
        {translateTo && (
          <TextAreaField
            label={
              <>
                {text.questionIn} <span lang={translateTo.code}>{translateTo.name}</span>{' '}
                <span className="sr-only">({name})</span>
              </>
            }
            lang={translateTo.code}
            value={asked.translations[translateTo.code] ?? ''}
            maxLength={translationLength(MAX_QUIZ_QUESTION_LENGTH)}
            onChange={(event) =>
              onChange({
                ...question,
                question: {
                  ...asked,
                  translations: withLanguage(
                    asked.translations,
                    translateTo.code,
                    event.target.value || undefined,
                  ),
                },
              })
            }
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={named(text.quizAnswer)}
          hint={text.quizAnswerHint}
          lang="en"
          value={question.answer}
          error={errors?.answer}
          maxLength={MAX_QUIZ_CHOICE_LENGTH}
          autoComplete="off"
          onChange={(event) => onChange({ ...question, answer: event.target.value })}
        />
        <TextAreaField
          label={named(text.quizOthers)}
          hint={text.quizOthersHint}
          lang="en"
          rows={3}
          value={question.others.join('\n')}
          error={errors?.others}
          onChange={(event) =>
            onChange({
              ...question,
              others: toLines(event.target.value, MAX_QUIZ_OTHERS, MAX_QUIZ_CHOICE_LENGTH),
            })
          }
        />
      </div>
    </li>
  )
}
