import { useState } from 'react'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { useLessonContent } from '../hooks/useLessonContent'
import { AdminSection } from './AdminSection'
import { DialogueEditor } from './DialogueEditor'
import { QuizEditor } from './QuizEditor'
import { RoleplayEditor } from './RoleplayEditor'

const text = adminText.lessons

/** The parts of the review that have content of their own, in the order learners list them. */
const parts = [
  { value: 'quiz', label: text.reviewQuiz },
  { value: 'listening', label: text.reviewListening },
  { value: 'roleplay', label: text.reviewRoleplay },
] as const
type Part = (typeof parts)[number]['value']

export type ReviewEditorProps = {
  /** The editor and the validation of each part, for the week on screen. */
  review: ReturnType<typeof useLessonContent>['review']
  /** The week's situation, in English, for the admin to write to. */
  situation: string
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/**
 * A week's review (Day 6), one part at a time: its quiz, its second conversation and its second
 * role-play. The last two are the editors of Day 1 and Day 4, filled with the review's own
 * content. The words and the challenge the review repeats are edited under their own days.
 */
export function ReviewEditor({ review, situation, translateTo }: ReviewEditorProps) {
  const [part, setPart] = useState<Part>('quiz')

  // A part that is out of sight also keeps the page from saving; say which one it is.
  const unfinishedElsewhere = parts.filter(
    ({ value }) => value !== part && !review[value].validation.valid,
  )

  return (
    <>
      <AdminSection title={text.review} description={text.reviewIntro}>
        <SegmentedControl<Part>
          legend={text.reviewPartLegend}
          value={part}
          onChange={setPart}
          options={parts}
        />
        {unfinishedElsewhere.length > 0 && (
          <p role="alert" className="text-sm font-bold text-danger">
            {text.errorElsewhere} {unfinishedElsewhere.map(({ label }) => label).join('; ')}
          </p>
        )}
      </AdminSection>

      {part === 'quiz' && <QuizEditor {...review.quiz} translateTo={translateTo} />}
      {part === 'listening' && (
        <DialogueEditor {...review.listening} situation={situation} translateTo={translateTo} />
      )}
      {part === 'roleplay' && <RoleplayEditor {...review.roleplay} translateTo={translateTo} />}
    </>
  )
}
