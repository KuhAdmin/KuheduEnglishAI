import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import {
  MAX_ALSO_ACCEPTED,
  MAX_SENTENCE_LENGTH,
  MAX_SENTENCE_TRANSLATION_LENGTH,
  MAX_TIP_LENGTH,
  MAX_TIPS,
  type PracticeSentence,
} from '@/shared/lib/curriculum/weekSentences'
import { DEFAULT_LANGUAGE } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { TextAreaField } from '@/shared/ui/TextAreaField'
import { adminText } from '../adminText'
import type { EditLanguage } from '../hooks/useEditLanguage'
import { toLines, withLanguage } from '../lib/lines'
import type { SentenceErrors } from '../lib/validateSentences'

const text = adminText.lessons

export type SentenceFieldsProps = {
  /** Position in the list, from 0. */
  index: number
  /** How many sentences the list has. */
  count: number
  sentence: PracticeSentence
  errors: SentenceErrors | undefined
  /** The learner language being written, if there is one besides English. */
  translateTo: EditLanguage | undefined
  onChange: (sentence: PracticeSentence) => void
  onMove: (offset: -1 | 1) => void
  onRemove: () => void
}

/** One sentence to translate: its English, what else counts as right, its source and its tips. */
export function SentenceFields({
  index,
  count,
  sentence,
  errors,
  translateTo,
  onChange,
  onMove,
  onRemove,
}: SentenceFieldsProps) {
  const name = `${text.sentence} ${index + 1}`
  // Every sentence has the same fields; its number tells them apart for assistive technology.
  const named = (label: string, language?: EditLanguage) => (
    <>
      {label}
      {language && (
        <>
          {' '}
          <span lang={language.code}>{language.name}</span>
        </>
      )}{' '}
      <span className="sr-only">({name})</span>
    </>
  )

  const setTips = (code: string, value: string) => {
    const tips = toLines(value, MAX_TIPS, MAX_TIP_LENGTH)
    onChange({
      ...sentence,
      tips: withLanguage(sentence.tips, code, tips.length > 0 ? tips : undefined),
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-extrabold">{name}</h3>
        <div className="flex shrink-0 items-center">
          <IconButton
            label={`${text.moveSentenceUp} ${index + 1}`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            label={`${text.moveSentenceDown} ${index + 1}`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown aria-hidden="true" className="size-5" />
          </IconButton>
          <IconButton
            variant="danger"
            label={`${text.removeSentence} ${index + 1}`}
            // The last sentence goes with the list itself, through its own button.
            disabled={count === 1}
            onClick={onRemove}
          >
            <Trash2 aria-hidden="true" className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={named(text.sentenceEnglish)}
          lang="en"
          value={sentence.english}
          error={errors?.english}
          maxLength={MAX_SENTENCE_LENGTH}
          onChange={(event) => onChange({ ...sentence, english: event.target.value })}
        />
        {translateTo && (
          <TextAreaField
            label={named(text.sentenceIn, translateTo)}
            lang={translateTo.code}
            value={sentence.translations[translateTo.code] ?? ''}
            maxLength={MAX_SENTENCE_TRANSLATION_LENGTH}
            onChange={(event) =>
              onChange({
                ...sentence,
                translations: withLanguage(
                  sentence.translations,
                  translateTo.code,
                  event.target.value || undefined,
                ),
              })
            }
          />
        )}
      </div>

      <TextAreaField
        label={named(text.alsoAccepted)}
        hint={text.alsoAcceptedHint}
        lang="en"
        rows={3}
        value={sentence.alsoAccepted.join('\n')}
        onChange={(event) =>
          onChange({
            ...sentence,
            alsoAccepted: toLines(event.target.value, MAX_ALSO_ACCEPTED, MAX_SENTENCE_LENGTH),
          })
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={named(`${text.tips}: English`)}
          hint={text.tipsEnglishHint}
          lang="en"
          rows={3}
          value={(sentence.tips[DEFAULT_LANGUAGE] ?? []).join('\n')}
          onChange={(event) => setTips(DEFAULT_LANGUAGE, event.target.value)}
        />
        {translateTo && (
          <TextAreaField
            label={named(`${text.tips}:`, translateTo)}
            hint={text.tipsHint}
            lang={translateTo.code}
            rows={3}
            value={(sentence.tips[translateTo.code] ?? []).join('\n')}
            onChange={(event) => setTips(translateTo.code, event.target.value)}
          />
        )}
      </div>
    </li>
  )
}
