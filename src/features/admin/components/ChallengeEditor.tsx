import { Plus } from 'lucide-react'
import {
  MAX_CHALLENGE_INSTRUCTION_LENGTH,
  MAX_CHALLENGE_PHRASE_LENGTH,
  MAX_CHALLENGE_PHRASES,
  MAX_CHALLENGE_TASKS,
  MAX_CHALLENGE_TITLE_LENGTH,
  translationLength,
  type ChallengeText,
  type WeekChallenge,
} from '@/shared/lib/curriculum/weekChallenges'
import { Button } from '@/shared/ui/Button'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { toLines, withLanguage } from '../lib/lines'
import type { ChallengeValidation } from '../lib/validateChallenge'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { ChallengeTaskFields } from './ChallengeTaskFields'

const text = adminText.lessons

const newTask: ChallengeText = { text: '', translations: {} }

export type ChallengeEditorProps = {
  editor: WeekContentEditor<WeekChallenge>
  validation: ChallengeValidation
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/** A week's challenge (Day 5): its name and instruction, what to do, and the help on offer. */
export function ChallengeEditor({ editor, validation, translateTo }: ChallengeEditorProps) {
  const challenge = editor.value

  const setTasks = (change: (tasks: ChallengeText[]) => ChallengeText[]) =>
    editor.set({ ...challenge, tasks: change([...challenge.tasks]) })

  const moveTask = (index: number, offset: -1 | 1) =>
    setTasks((tasks) => {
      const [moved] = tasks.splice(index, 1)
      if (moved) tasks.splice(index + offset, 0, moved)
      return tasks
    })

  const translated = (value: ChallengeText, code: string, written: string): ChallengeText => ({
    ...value,
    translations: withLanguage(value.translations, code, written || undefined),
  })

  return (
    <>
      <AdminSection
        title={text.challenge}
        description={text.challengeIntro}
        actions={
          editor.written && (
            <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
              {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
            </Button>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label={text.challengeTitle}
            lang="en"
            value={challenge.title.text}
            error={validation.title}
            maxLength={MAX_CHALLENGE_TITLE_LENGTH}
            autoComplete="off"
            onChange={(event) =>
              editor.set({ ...challenge, title: { ...challenge.title, text: event.target.value } })
            }
          />
          {translateTo && (
            <TextField
              label={
                <>
                  {text.challengeTitleIn} <span lang={translateTo.code}>{translateTo.name}</span>
                </>
              }
              lang={translateTo.code}
              value={challenge.title.translations[translateTo.code] ?? ''}
              maxLength={translationLength(MAX_CHALLENGE_TITLE_LENGTH)}
              autoComplete="off"
              onChange={(event) =>
                editor.set({
                  ...challenge,
                  title: translated(challenge.title, translateTo.code, event.target.value),
                })
              }
            />
          )}
          <TextAreaField
            label={text.instruction}
            hint={text.instructionHint}
            lang="en"
            value={challenge.instruction.text}
            maxLength={MAX_CHALLENGE_INSTRUCTION_LENGTH}
            onChange={(event) =>
              editor.set({
                ...challenge,
                instruction: { ...challenge.instruction, text: event.target.value },
              })
            }
          />
          {translateTo && (
            <TextAreaField
              label={
                <>
                  {text.instructionIn} <span lang={translateTo.code}>{translateTo.name}</span>
                </>
              }
              lang={translateTo.code}
              value={challenge.instruction.translations[translateTo.code] ?? ''}
              maxLength={translationLength(MAX_CHALLENGE_INSTRUCTION_LENGTH)}
              onChange={(event) =>
                editor.set({
                  ...challenge,
                  instruction: translated(
                    challenge.instruction,
                    translateTo.code,
                    event.target.value,
                  ),
                })
              }
            />
          )}
        </div>
      </AdminSection>

      <AdminSection title={text.tasks} description={text.tasksIntro}>
        {challenge.tasks.length === 0 && <p className="text-fg-muted">{text.emptyTasks}</p>}

        <ol className="flex flex-col gap-3">
          {challenge.tasks.map((task, index) => (
            <ChallengeTaskFields
              key={index}
              index={index}
              count={challenge.tasks.length}
              task={task}
              errors={validation.tasks[index]}
              translateTo={translateTo}
              onChange={(changed) =>
                setTasks((tasks) => tasks.map((other, i) => (i === index ? changed : other)))
              }
              onMove={(offset) => moveTask(index, offset)}
              onRemove={() => setTasks((tasks) => tasks.filter((_, i) => i !== index))}
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
          disabled={challenge.tasks.length >= MAX_CHALLENGE_TASKS}
          onClick={() => setTasks((tasks) => [...tasks, newTask])}
        >
          <Plus aria-hidden="true" className="size-5" />
          {text.addTask}
        </Button>
      </AdminSection>

      <AdminSection title={text.phrases} description={text.phrasesIntro}>
        <TextAreaField
          label={text.phrasesField}
          hint={text.phrasesHint}
          lang="en"
          rows={4}
          value={challenge.phrases.join('\n')}
          onChange={(event) =>
            editor.set({
              ...challenge,
              phrases: toLines(
                event.target.value,
                MAX_CHALLENGE_PHRASES,
                MAX_CHALLENGE_PHRASE_LENGTH,
              ),
            })
          }
        />
      </AdminSection>
    </>
  )
}
