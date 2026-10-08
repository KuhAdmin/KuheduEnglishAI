import { Plus } from 'lucide-react'
import {
  MAX_QUIZ_QUESTIONS,
  type QuizQuestion,
  type WeekQuiz,
} from '@/shared/lib/curriculum/weekQuizzes'
import { Button } from '@/shared/ui/Button'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { QuizValidation } from '../lib/validateQuiz'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { QuizQuestionFields } from './QuizQuestionFields'

const text = adminText.lessons

const newQuestion: QuizQuestion = {
  question: { text: '', translations: {} },
  answer: '',
  others: [],
}

export type QuizEditorProps = {
  editor: WeekContentEditor<WeekQuiz>
  validation: QuizValidation
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/** A week's quick quiz (part of Day 6's review), in the order its questions are asked. */
export function QuizEditor({ editor, validation, translateTo }: QuizEditorProps) {
  const { questions } = editor.value

  const setQuestions = (change: (questions: QuizQuestion[]) => QuizQuestion[]) =>
    editor.set({ questions: change([...questions]) })

  const moveQuestion = (index: number, offset: -1 | 1) =>
    setQuestions((list) => {
      const [moved] = list.splice(index, 1)
      if (moved) list.splice(index + offset, 0, moved)
      return list
    })

  return (
    <AdminSection
      title={text.quiz}
      description={text.quizIntro}
      actions={
        editor.written && (
          <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
            {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
          </Button>
        )
      }
    >
      {questions.length === 0 && <p className="text-fg-muted">{text.emptyQuiz}</p>}

      <ol className="flex flex-col gap-3">
        {questions.map((question, index) => (
          <QuizQuestionFields
            key={index}
            index={index}
            count={questions.length}
            question={question}
            errors={validation.questions[index]}
            translateTo={translateTo}
            onChange={(changed) =>
              setQuestions((list) => list.map((other, i) => (i === index ? changed : other)))
            }
            onMove={(offset) => moveQuestion(index, offset)}
            onRemove={() => setQuestions((list) => list.filter((_, i) => i !== index))}
          />
        ))}
      </ol>

      {validation.list && (
        <p role="alert" className="text-sm font-bold text-danger">
          {validation.list}
        </p>
      )}

      <Button
        variant="secondary"
        className="self-start"
        disabled={questions.length >= MAX_QUIZ_QUESTIONS}
        onClick={() => setQuestions((list) => [...list, newQuestion])}
      >
        <Plus aria-hidden="true" className="size-5" />
        {text.addQuestion}
      </Button>
    </AdminSection>
  )
}
