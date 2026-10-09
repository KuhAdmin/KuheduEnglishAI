import { ChoiceList } from './ChoiceList'
import { LanguageFlag } from './LanguageFlag'

export type LanguageChoice = {
  /** BCP-47 tag: the value of the choice, and the `lang` its name is marked with. */
  code: string
  /** The language's own name, in its own script (e.g. "বাংলা"). */
  nativeName: string
  /** Short note shown in brackets after the name, usually the English name. */
  caption?: string
  /** `null` shows the code's initials. */
  flagUrl: string | null
}

export type LanguageChoiceListProps = {
  /** Accessible name of the group. */
  legend: string
  languages: readonly LanguageChoice[]
  /** `null` when none of the languages is the chosen one. */
  value: string | null
  onChange: (code: string) => void
  className?: string
}

/**
 * Pick one language. Each is named in its own script beside its flag, so a learner finds
 * theirs whatever language the screen around it is in.
 */
export function LanguageChoiceList({
  legend,
  languages,
  value,
  onChange,
  className,
}: LanguageChoiceListProps) {
  return (
    <ChoiceList
      legend={legend}
      value={value}
      onChange={onChange}
      className={className}
      options={languages.map((language) => ({
        value: language.code,
        media: <LanguageFlag flagUrl={language.flagUrl} code={language.code} />,
        label: (
          <>
            <span lang={language.code}>{language.nativeName}</span>
            {language.caption && (
              <>
                {' '}
                <span lang="en" className="font-normal text-fg-muted">
                  ({language.caption})
                </span>
              </>
            )}
          </>
        ),
      }))}
    />
  )
}
