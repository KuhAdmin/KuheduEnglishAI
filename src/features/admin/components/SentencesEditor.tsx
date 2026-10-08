import { Plus } from 'lucide-react'
import {
  MAX_SENTENCES,
  type PracticeSentence,
  type WeekSentences,
} from '@/shared/lib/curriculum/weekSentences'
import { Button } from '@/shared/ui/Button'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { SentencesValidation } from '../lib/validateSentences'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { SentenceFields } from './SentenceFields'

const text = adminText.lessons

const newSentence: PracticeSentence = { english: '', alsoAccepted: [], translations: {}, tips: {} }

export type SentencesEditorProps = {
  editor: WeekContentEditor<WeekSentences>
  validation: SentencesValidation
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/** A week's sentences (Day 3, "Translate and speak"), in the order learners get them. */
export function SentencesEditor({ editor, validation, translateTo }: SentencesEditorProps) {
  const { sentences } = editor.value

  const setSentences = (change: (sentences: PracticeSentence[]) => PracticeSentence[]) =>
    editor.set({ sentences: change([...sentences]) })

  const moveSentence = (index: number, offset: -1 | 1) =>
    setSentences((list) => {
      const [moved] = list.splice(index, 1)
      if (moved) list.splice(index + offset, 0, moved)
      return list
    })

  return (
    <AdminSection
      title={text.sentences}
      description={text.sentencesIntro}
      actions={
        editor.written && (
          <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
            {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
          </Button>
        )
      }
    >
      {sentences.length === 0 && <p className="text-fg-muted">{text.emptySentences}</p>}

      <ol className="flex flex-col gap-3">
        {sentences.map((sentence, index) => (
          <SentenceFields
            key={index}
            index={index}
            count={sentences.length}
            sentence={sentence}
            errors={validation.sentences[index]}
            translateTo={translateTo}
            onChange={(changed) =>
              setSentences((list) => list.map((other, i) => (i === index ? changed : other)))
            }
            onMove={(offset) => moveSentence(index, offset)}
            onRemove={() => setSentences((list) => list.filter((_, i) => i !== index))}
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
        disabled={sentences.length >= MAX_SENTENCES}
        onClick={() => setSentences((list) => [...list, newSentence])}
      >
        <Plus aria-hidden="true" className="size-5" />
        {text.addSentence}
      </Button>
    </AdminSection>
  )
}
