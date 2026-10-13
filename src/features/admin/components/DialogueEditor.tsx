import { Plus } from 'lucide-react'
import {
  dialogueSpeakers,
  MAX_DIALOGUE_LINES,
  speakerVoice,
  speakerVoices,
  type DialogueLine,
  type WeekDialogue,
} from '@/shared/lib/curriculum/weekDialogues'
import { Button } from '@/shared/ui/Button'
import { SelectField } from '@/shared/ui/SelectField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { DialogueValidation } from '../lib/validateDialogue'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { DialogueLineFields } from './DialogueLineFields'

const text = adminText.lessons

const voiceOptions = [
  { value: '', label: text.voiceByTurn },
  { value: 'female', label: text.voiceFemale },
  { value: 'male', label: text.voiceMale },
]

export type DialogueEditorProps = {
  editor: WeekContentEditor<WeekDialogue>
  validation: DialogueValidation
  /** The week's situation, in English, for the admin to write to. */
  situation: string
  /** The learner language whose translation is being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/**
 * A week's conversation (Day 1, "Watch and listen"): its lines, whose voice is a woman's and
 * whose a man's, and an optional video of it.
 */
export function DialogueEditor({
  editor,
  validation,
  situation,
  translateTo,
}: DialogueEditorProps) {
  const dialogue = editor.value
  const speakers = dialogueSpeakers(dialogue.lines)

  // A voice belongs to a name: it goes when nobody speaks under that name any more, and the
  // rest are kept in the order the schema stores them, so an undone edit leaves nothing to save.
  const set = ({ voices: _, ...rest }: WeekDialogue, voices: unknown = dialogue.voices) => {
    const kept = speakerVoices(rest.lines, voices)
    editor.set(kept ? { ...rest, voices: kept } : rest)
  }

  const setLines = (change: (lines: DialogueLine[]) => DialogueLine[]) =>
    set({ ...dialogue, lines: change([...dialogue.lines]) })

  const addLine = () =>
    setLines((lines) => [
      ...lines,
      // Two people take turns, so a new line is most likely the speaker before the last one.
      { speaker: lines.at(-2)?.speaker ?? '', text: '', translations: {} },
    ])

  const moveLine = (index: number, offset: -1 | 1) =>
    setLines((lines) => {
      const [moved] = lines.splice(index, 1)
      if (moved) lines.splice(index + offset, 0, moved)
      return lines
    })

  return (
    <>
      <AdminSection
        title={text.conversation}
        description={`${text.conversationIntro} ${text.situation}: ${situation}.`}
        actions={
          editor.written && (
            <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
              {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
            </Button>
          )
        }
      >
        {dialogue.lines.length === 0 && <p className="text-fg-muted">{text.empty}</p>}

        <ol className="flex flex-col gap-3">
          {dialogue.lines.map((line, index) => (
            <DialogueLineFields
              key={index}
              index={index}
              count={dialogue.lines.length}
              line={line}
              errors={validation.lines[index]}
              translateTo={translateTo}
              onChange={(changed) =>
                setLines((lines) => lines.map((other, i) => (i === index ? changed : other)))
              }
              onMove={(offset) => moveLine(index, offset)}
              onRemove={() => setLines((lines) => lines.filter((_, i) => i !== index))}
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
          disabled={dialogue.lines.length >= MAX_DIALOGUE_LINES}
          onClick={addLine}
        >
          <Plus aria-hidden="true" className="size-5" />
          {text.addLine}
        </Button>
      </AdminSection>

      {speakers.length > 0 && (
        <AdminSection title={text.voices} description={text.voicesIntro}>
          <div className="grid gap-3 sm:grid-cols-2">
            {speakers.map((speaker) => (
              <SelectField
                key={speaker}
                label={
                  <>
                    {text.voiceOf} <span lang="en">{speaker}</span>
                  </>
                }
                options={voiceOptions}
                value={speakerVoice(dialogue, speaker) ?? ''}
                onChange={(event) =>
                  set(dialogue, { ...dialogue.voices, [speaker]: event.target.value })
                }
              />
            ))}
          </div>
        </AdminSection>
      )}

      <AdminSection title={text.video} description={text.videoIntro}>
        <TextField
          type="url"
          inputMode="url"
          label={text.videoUrl}
          hint={text.videoHint}
          placeholder="https://"
          value={dialogue.videoUrl ?? ''}
          error={validation.video}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => set({ ...dialogue, videoUrl: event.target.value || null })}
        />
      </AdminSection>
    </>
  )
}
