import type { CurriculumKey } from '@/shared/lib/curriculum/curriculum'
import {
  maxCurriculumTextLength,
  type CurriculumOverrides,
} from '@/shared/lib/curriculum/curriculumOverrides'
import { builtInCurriculum, curriculumText } from '@/shared/lib/curriculum/useCurriculum'
import { DEFAULT_LANGUAGE, isEnglish } from '@/shared/lib/i18n'
import { adminText } from '../adminText'
import { TextOverrideField } from './TextOverrideField'

export type CurriculumTextFieldProps = {
  textKey: CurriculumKey
  /** The language being edited (BCP-47). */
  language: string
  /** The draft being edited, in every language. */
  overrides: CurriculumOverrides
  /** Visible name of the field, e.g. "Goal". */
  label: string
  /** What the text belongs to, e.g. "Week 16": tells fields with the same label apart. */
  scope?: string
  /** `undefined` puts the text back on the built-in wording. */
  onChange: (text: string | undefined) => void
}

/** One text of the course in one language, with the English wording to write it from. */
export function CurriculumTextField({
  textKey,
  language,
  overrides,
  label,
  scope,
  onChange,
}: CurriculumTextFieldProps) {
  const english = curriculumText(DEFAULT_LANGUAGE, textKey, overrides)

  return (
    <TextOverrideField
      label={
        scope ? (
          <>
            {/* Space outside, brackets inside: the name then reads the same in every browser,
                whether or not it puts its own space before a visually hidden part. */}
            {label} <span className="sr-only">({scope})</span>
          </>
        ) : (
          label
        )
      }
      language={language}
      builtIn={builtInCurriculum(language)?.[textKey]}
      override={overrides[language]?.[textKey]}
      fallback={english}
      maxLength={maxCurriculumTextLength(textKey)}
      note={
        isEnglish(language) ? undefined : (
          <span>
            {adminText.curriculum.english}: {english}
          </span>
        )
      }
      resetName={scope ? `${label} (${scope})` : label}
      onChange={onChange}
      onReset={() => onChange(undefined)}
    />
  )
}
