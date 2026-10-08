import { Plus } from 'lucide-react'
import {
  MAX_VOCABULARY_WORDS,
  type VocabularyWord,
  type WeekVocabulary,
} from '@/shared/lib/curriculum/weekVocabulary'
import { Button } from '@/shared/ui/Button'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { VocabularyValidation } from '../lib/validateVocabulary'
import type { WeekContentEditor } from '../lib/weekContent'
import { AdminSection } from './AdminSection'
import { WordFields } from './WordFields'

const text = adminText.lessons

const newWord: VocabularyWord = { word: '', phonetic: '', imageUrl: null, meanings: {} }

export type VocabularyEditorProps = {
  editor: WeekContentEditor<WeekVocabulary>
  validation: VocabularyValidation
  /** The learner language whose meanings are being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
}

/** A week's words (Day 2, "Learn useful words"), in the order learners see them. */
export function VocabularyEditor({ editor, validation, translateTo }: VocabularyEditorProps) {
  const { words } = editor.value

  const setWords = (change: (words: VocabularyWord[]) => VocabularyWord[]) =>
    editor.set({ words: change([...words]) })

  const moveWord = (index: number, offset: -1 | 1) =>
    setWords((list) => {
      const [moved] = list.splice(index, 1)
      if (moved) list.splice(index + offset, 0, moved)
      return list
    })

  return (
    <AdminSection
      title={text.words}
      description={text.wordsIntro}
      actions={
        editor.written && (
          <Button variant="ghost" className="shrink-0" onClick={editor.remove}>
            {editor.hasBuiltIn ? text.useBuiltIn : text.removeContent}
          </Button>
        )
      }
    >
      {words.length === 0 && <p className="text-fg-muted">{text.emptyWords}</p>}

      <ol className="flex flex-col gap-3">
        {words.map((word, index) => (
          <WordFields
            key={index}
            index={index}
            count={words.length}
            word={word}
            errors={validation.words[index]}
            translateTo={translateTo}
            onChange={(changed) =>
              setWords((list) => list.map((other, i) => (i === index ? changed : other)))
            }
            onMove={(offset) => moveWord(index, offset)}
            onRemove={() => setWords((list) => list.filter((_, i) => i !== index))}
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
        disabled={words.length >= MAX_VOCABULARY_WORDS}
        onClick={() => setWords((list) => [...list, newWord])}
      >
        <Plus aria-hidden="true" className="size-5" />
        {text.addWord}
      </Button>
    </AdminSection>
  )
}
