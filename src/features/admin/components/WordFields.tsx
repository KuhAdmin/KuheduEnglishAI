import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import {
  MAX_MEANING_LENGTH,
  MAX_PHONETIC_LENGTH,
  MAX_WORD_LENGTH,
  WORD_PICTURE_BOUNDS,
  type VocabularyWord,
} from '@/shared/lib/curriculum/weekVocabulary'
import { IconButton } from '@/shared/ui/IconButton'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import type { VocabularyWordErrors } from '../lib/validateVocabulary'
import { ImageField } from './ImageField'

const text = adminText.lessons

export type WordFieldsProps = {
  /** Position in the list, from 0. */
  index: number
  /** How many words the list has. */
  count: number
  word: VocabularyWord
  errors: VocabularyWordErrors | undefined
  /** The learner language whose meaning is being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (word: VocabularyWord) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/** One word to learn: how it is written, how it sounds, what it means, and its picture. */
export function WordFields({
  index,
  count,
  word,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: WordFieldsProps) {
  const name = `${text.word} ${index + 1}`
  // Every word has the same fields; its number tells them apart for assistive technology.
  const named = (label: string) => (
    <>
      {label} <span className="sr-only">({name})</span>
    </>
  )

  const setMeaning = (code: string, value: string) => {
    const others = Object.entries(word.meanings).filter(([language]) => language !== code)
    const entries = value ? [...others, [code, value] as [string, string]] : others
    // Sorted, like the schema stores them, so an undone edit leaves nothing to save.
    entries.sort(([a], [b]) => a.localeCompare(b))
    onChange({ ...word, meanings: Object.fromEntries(entries) })
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveWordUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveWordDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.removeWord} ${index + 1}`}
            // The last word goes with the list itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={named(text.wordField)}
          lang="en"
          value={word.word}
          error={errors?.word}
          maxLength={MAX_WORD_LENGTH}
          autoCapitalize="none"
          autoComplete="off"
          onChange={(event) => onChange({ ...word, word: event.target.value })}
        />
        <TextField
          label={named(text.phonetic)}
          hint={text.phoneticHint}
          lang="en"
          value={word.phonetic}
          maxLength={MAX_PHONETIC_LENGTH}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange({ ...word, phonetic: event.target.value })}
        />
      </div>

      {translateTo && (
        <TextField
          label={
            <>
              {text.meaning}: <span lang={translateTo.code}>{translateTo.name}</span>{' '}
              <span className="sr-only">({name})</span>
            </>
          }
          lang={translateTo.code}
          value={word.meanings[translateTo.code] ?? ''}
          maxLength={MAX_MEANING_LENGTH}
          autoComplete="off"
          onChange={(event) => setMeaning(translateTo.code, event.target.value)}
        />
      )}

      <ImageField
        label={`${text.wordPicture}: ${name}`}
        hint={text.wordPictureHint}
        value={word.imageUrl}
        defaultValue={null}
        onChange={(imageUrl) => onChange({ ...word, imageUrl })}
        bounds={WORD_PICTURE_BOUNDS}
      />
    </li>
  )
}
