import { CircleCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { cn } from '@/shared/lib/cn'
import { MAX_SENTENCE_LENGTH } from '@/shared/lib/curriculum/weekSentences'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/TextField'

export type TranslationFormProps = {
  /** What the learner has typed so far. */
  value: string
  onChange: (value: string) => void
  /** The English answer is on show (they checked a translation, or asked for it). */
  answerShown: boolean
  /** What they last checked is one of the accepted sentences. */
  matched: boolean
  /** Compare what is typed with the accepted sentences, and show the answer. */
  onCheck: () => void
}

/**
 * Where the learner writes their translation. One button does both jobs: "Check" once something
 * is typed, "Show answer" while nothing is. A translation that is not recognised is never called
 * wrong — the comparison knows only the sentences an admin listed — it is set beside the answer.
 */
export function TranslationForm({
  value,
  onChange,
  answerShown,
  matched,
  onCheck,
}: TranslationFormProps) {
  const t = useT()
  const typed = value.trim() !== ''
  // Nothing left for the button to do: the tick is there, or the answer is and nothing is typed.
  const settled = matched || (answerShown && !typed)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!settled) onCheck()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <TextField
        label={t('lessonDay.translate.field')}
        lang="en"
        value={value}
        maxLength={MAX_SENTENCE_LENGTH}
        autoComplete="off"
        autoCapitalize="sentences"
        autoCorrect="off"
        // The keyboard's own corrections would do the learner's work, or mark a name as wrong.
        spellCheck={false}
        enterKeyHint="done"
        onChange={(event) => onChange(event.target.value)}
        endAdornment={
          matched && (
            <span className="flex size-11 items-center justify-center text-success">
              <CircleCheck aria-hidden="true" className="size-6" />
            </span>
          )
        }
      />
      {!settled && (
        <Button type="submit" variant="secondary" fullWidth>
          {t(typed ? 'lessonDay.translate.check' : 'lessonDay.translate.showAnswer')}
        </Button>
      )}
      {/* Last, so that "compare with this one" sits right above the answer. Always there, so
          that what it comes to say is announced; the tick alone says nothing. */}
      <p
        role="status"
        className={cn(
          'empty:hidden',
          matched ? 'rounded-md bg-success-soft px-4 py-3 font-bold text-fg' : 'text-fg-muted',
        )}
      >
        {matched
          ? t('lessonDay.translate.right')
          : answerShown && typed
            ? t('lessonDay.translate.compare')
            : null}
      </p>
    </form>
  )
}
