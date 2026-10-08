import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import {
  MAX_CHALLENGE_TASK_LENGTH,
  translationLength,
  type ChallengeText,
} from '@/shared/lib/curriculum/weekChallenges'
import { IconButton } from '@/shared/ui/IconButton'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { withLanguage } from '../lib/lines'
import type { ChallengeTaskErrors } from '../lib/validateChallenge'

const text = adminText.lessons

export type ChallengeTaskFieldsProps = {
  /** Position in the list, from 0. */
  index: number
  /** How many tasks the challenge has. */
  count: number
  task: ChallengeText
  errors: ChallengeTaskErrors | undefined
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (task: ChallengeText) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/** One thing a challenge asks the learner to do, in English and in the language being written. */
export function ChallengeTaskFields({
  index,
  count,
  task,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: ChallengeTaskFieldsProps) {
  const name = `${text.task} ${index + 1}`

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveTaskUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveTaskDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.removeTask} ${index + 1}`}
            // The last task goes with the challenge itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          // Every task has the same fields; its number tells them apart for assistive technology.
          label={
            <>
              {text.taskText} <span className="sr-only">({name})</span>
            </>
          }
          lang="en"
          value={task.text}
          error={errors?.text}
          maxLength={MAX_CHALLENGE_TASK_LENGTH}
          autoComplete="off"
          onChange={(event) => onChange({ ...task, text: event.target.value })}
        />
        {translateTo && (
          <TextField
            label={
              <>
                {text.taskIn} <span lang={translateTo.code}>{translateTo.name}</span>{' '}
                <span className="sr-only">({name})</span>
              </>
            }
            lang={translateTo.code}
            value={task.translations[translateTo.code] ?? ''}
            maxLength={translationLength(MAX_CHALLENGE_TASK_LENGTH)}
            autoComplete="off"
            onChange={(event) =>
              onChange({
                ...task,
                translations: withLanguage(
                  task.translations,
                  translateTo.code,
                  event.target.value || undefined,
                ),
              })
            }
          />
        )}
      </div>
    </li>
  )
}
