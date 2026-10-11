import { cn } from '@/shared/lib/cn'
import { syllableLetters } from '@/shared/lib/curriculum/weekVocabulary'
import { useT } from '@/shared/lib/i18n'

export type SyllableLineProps = {
  /** The word's parts, as `VocabularyWord.syllables` writes them: "nic(e)", "to", "meet", "you". */
  syllables: readonly string[]
  /** Which part is the strong one, counted from 1; `null` when none is marked. */
  stress: number | null
}

/**
 * How a word is said, shown on the word itself: its parts side by side, the strong one larger
 * and named, and the letters that are not said crossed out. It teaches; it judges nothing.
 */
export function SyllableLine({ syllables, stress }: SyllableLineProps) {
  const t = useT()
  const parts = syllables.map(syllableLetters)
  const silent = parts.flat().filter((run) => run.silent)

  return (
    <div className="flex flex-col gap-1">
      <ol aria-label={t('lessonDay.words.parts')} className="flex flex-wrap items-start gap-1">
        {parts.map((runs, index) => {
          const strong = index + 1 === stress
          return (
            <li key={index} className="flex flex-col items-center">
              <span
                lang="en"
                className={cn(
                  'rounded-sm px-1.5 leading-7 font-extrabold',
                  strong ? 'bg-primary text-lg text-on-primary' : 'bg-surface text-base text-fg',
                )}
              >
                {runs.map((run, at) =>
                  run.silent ? (
                    // Read out below instead: a screen reader does not say that a letter is struck.
                    // Thin letters under a full-weight line: on a bold "e" the line is lost.
                    <s
                      key={at}
                      aria-hidden="true"
                      className={cn(
                        'font-normal line-through decoration-2',
                        strong ? 'decoration-on-primary' : 'text-fg-muted decoration-fg',
                      )}
                    >
                      {run.text}
                    </s>
                  ) : (
                    run.text
                  ),
                )}
              </span>
              {/* Size and fill alone would leave "strong" to the eye, and to colour. */}
              {strong && <span className="text-sm font-bold">{t('lessonDay.words.strong')}</span>}
            </li>
          )
        })}
      </ol>
      {silent.length > 0 && (
        <p className="relative text-sm">
          {t('lessonDay.words.silentNote')}
          <span lang="en" className="sr-only">
            : {silent.map((run) => run.text).join(', ')}
          </span>
        </p>
      )}
    </div>
  )
}
