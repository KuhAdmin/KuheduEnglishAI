import type { ReactNode } from 'react'
import {
  MAX_SYLLABLE_LENGTH,
  MAX_SYLLABLES,
  MAX_WORD_TIP_LENGTH,
  MAX_WORD_TIPS,
  type VocabularyWord,
} from '@/shared/lib/curriculum/weekVocabulary'
import { DEFAULT_LANGUAGE } from '@/shared/lib/i18n'
import { SelectField } from '@/shared/ui/SelectField'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { TextField } from '@/shared/ui/TextField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { toLines, withLanguage } from '../lib/lines'
import type { VocabularyWordErrors } from '../lib/validateVocabulary'

const text = adminText.lessons

// Between the parts in the field; a word's own hyphen ("T-shirt") splits it the same way.
const PART_SEPARATOR = '-'

export type WordSoundFieldsProps = {
  word: VocabularyWord
  errors: VocabularyWordErrors | undefined
  /** The learner language whose tips are being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  /** Adds the word's number to a label, which tells its fields from another word's. */
  named: (label: string, language?: EditLanguage) => ReactNode
  onChange: (word: VocabularyWord) => void
}

/** How a word is said: the parts it falls into, which one is strong, and tips on saying it. */
export function WordSoundFields({
  word,
  errors,
  translateTo,
  named,
  onChange,
}: WordSoundFieldsProps) {
  const setParts = (value: string) => {
    // Cut to its limits as it is typed, the way `maxLength` cuts a single text.
    const syllables =
      value === ''
        ? []
        : value
            .split(PART_SEPARATOR)
            .slice(0, MAX_SYLLABLES)
            .map((part) => part.slice(0, MAX_SYLLABLE_LENGTH))
    // A strong part that is no longer there cannot stay chosen.
    const stress = word.stress !== null && word.stress <= syllables.length ? word.stress : null
    onChange({ ...word, syllables, stress })
  }

  const setTips = (code: string, value: string) => {
    const tips = toLines(value, MAX_WORD_TIPS, MAX_WORD_TIP_LENGTH)
    onChange({ ...word, tips: withLanguage(word.tips, code, tips.length > 0 ? tips : undefined) })
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label={named(text.wordParts)}
          hint={text.wordPartsHint}
          lang="en"
          value={word.syllables.join(PART_SEPARATOR)}
          error={errors?.syllables}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => setParts(event.target.value)}
        />
        <SelectField
          label={named(text.strongPart)}
          options={[
            { value: '', label: text.noStrongPart },
            ...word.syllables.map((part, index) => ({
              value: String(index + 1),
              label: `${index + 1} · ${part}`,
            })),
          ]}
          value={word.stress === null ? '' : String(word.stress)}
          error={errors?.stress}
          onChange={(event) =>
            onChange({ ...word, stress: event.target.value ? Number(event.target.value) : null })
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={named(`${text.wordTips}: English`)}
          hint={text.tipsEnglishHint}
          lang="en"
          rows={3}
          value={(word.tips[DEFAULT_LANGUAGE] ?? []).join('\n')}
          onChange={(event) => setTips(DEFAULT_LANGUAGE, event.target.value)}
        />
        {translateTo && (
          <TextAreaField
            label={named(`${text.wordTips}:`, translateTo)}
            hint={text.tipsHint}
            lang={translateTo.code}
            rows={3}
            value={(word.tips[translateTo.code] ?? []).join('\n')}
            onChange={(event) => setTips(translateTo.code, event.target.value)}
          />
        )}
      </div>
    </>
  )
}
