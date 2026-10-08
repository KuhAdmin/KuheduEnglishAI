import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import {
  MAX_LINE_LENGTH,
  MAX_LINE_TRANSLATION_LENGTH,
  MAX_SPEAKER_LENGTH,
  type DialogueLine,
} from '@/shared/lib/curriculum/weekDialogues'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { DialogueLineErrors } from '../lib/validateDialogue'

const text = adminText.lessons

export type DialogueLineFieldsProps = {
  /** Position in the conversation, from 0. */
  index: number
  /** How many lines the conversation has. */
  count: number
  line: DialogueLine
  errors: DialogueLineErrors | undefined
  /** The learner language whose translation is being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (line: DialogueLine) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/** One line of a conversation: who says it, what they say, and what it means. */
export function DialogueLineFields({
  index,
  count,
  line,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: DialogueLineFieldsProps) {
  const name = `${text.line} ${index + 1}`
  // Every line has the same fields; the line's number tells them apart for assistive technology.
  const named = (label: string) => (
    <>
      {label} <span className="sr-only">({name})</span>
    </>
  )

  const setTranslation = (code: string, value: string) => {
    const others = Object.entries(line.translations).filter(([language]) => language !== code)
    const entries = value ? [...others, [code, value] as [string, string]] : others
    // Sorted, like the schema stores them, so an undone edit leaves nothing to save.
    entries.sort(([a], [b]) => a.localeCompare(b))
    onChange({ ...line, translations: Object.fromEntries(entries) })
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.remove} ${index + 1}`}
            // The last line goes with the conversation itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <TextField
          label={named(text.speaker)}
          lang="en"
          value={line.speaker}
          error={errors?.speaker}
          maxLength={MAX_SPEAKER_LENGTH}
          autoComplete="off"
          onChange={(event) => onChange({ ...line, speaker: event.target.value })}
        />
        <TextAreaField
          className="sm:col-span-3"
          label={named(text.english)}
          lang="en"
          value={line.text}
          error={errors?.text}
          maxLength={MAX_LINE_LENGTH}
          onChange={(event) => onChange({ ...line, text: event.target.value })}
        />
      </div>

      {translateTo && (
        <TextAreaField
          label={
            <>
              <span lang={translateTo.code}>{translateTo.name}</span>{' '}
              <span className="sr-only">({name})</span>
            </>
          }
          lang={translateTo.code}
          value={line.translations[translateTo.code] ?? ''}
          maxLength={MAX_LINE_TRANSLATION_LENGTH}
          onChange={(event) => setTranslation(translateTo.code, event.target.value)}
        />
      )}
    </li>
  )
}
