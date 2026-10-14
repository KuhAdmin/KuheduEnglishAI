import { Check, Lightbulb, MicOff, TriangleAlert } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'
import type { PronunciationCheck } from '../hooks/usePronunciationCheck'
import { CompareByEar } from './CompareByEar'
import { FindingLine, type SaidKind } from './FindingLine'

export type PronunciationFeedbackProps = {
  /** What checking the recording came to. Nothing is drawn until it has come to something. */
  check: PronunciationCheck
  /** The word's parts, as a lesson writes them: "We(d)n(e)s", "day". Empty when not written. */
  syllables?: readonly string[]
  /** Say the word aloud. Called from a tap. Left out when the app has no voice. */
  onPlayWord?: () => void
  /** Play the learner's recording back to them. Called from a tap. */
  onPlayTake: () => void
  /** The word is being said, or the recording played: the other waits its turn. */
  playingWord?: boolean
  playingTake?: boolean
  /** What was said: a word (Day 2), or a sentence (Day 3), which is not called "the word". */
  kind?: SaidKind
}

/**
 * What the server heard in a recording of a word. It has not been measured on learners yet, so
 * it can be wrong, and nothing may count on it; the card no longer says so (the user had the note
 * taken off on 2026-10-14). The words and the icon say what was found; the colour only adds to
 * them, and stays soft: this is something to try, not a mark. With something to try come the two sounds to compare (`CompareByEar`).
 */
export function PronunciationFeedback({
  check,
  syllables = [],
  onPlayWord,
  onPlayTake,
  playingWord = false,
  playingTake = false,
  kind = 'word',
}: PronunciationFeedbackProps) {
  const t = useT()
  const heading = useId()
  if (check.status === 'idle' || check.status === 'checking') return null

  if (check.status === 'failed') {
    return (
      <p
        role="alert"
        className="flex animate-fade-in items-start gap-3 rounded-xl bg-warning-soft p-4 font-bold text-fg"
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        {t(
          check.problem === 'unreadable' && kind === 'sentence'
            ? 'lessonDay.feedback.unreadableSentence'
            : `lessonDay.feedback.${check.problem}`,
        )}
      </p>
    )
  }

  const [first] = check.findings
  const right = first?.code === 'ok'
  const silent = first?.code === 'nothingHeard'
  const Icon = right ? Check : silent ? MicOff : Lightbulb
  const corrections = right || silent ? [] : check.findings

  return (
    <section
      aria-label={t('lessonDay.feedback.title')}
      aria-live="polite"
      className={cn(
        'flex animate-fade-in flex-col gap-3 rounded-xl p-4 text-fg',
        right ? 'bg-success-soft' : 'bg-warning-soft',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface',
            right ? 'text-success' : 'text-warning',
          )}
        >
          <Icon className="size-5" strokeWidth={right ? 3 : 2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p id={heading} className="font-extrabold">
            {t(
              right
                ? 'lessonDay.feedback.ok'
                : silent
                  ? 'lessonDay.feedback.nothingHeard'
                  : 'lessonDay.feedback.toTry',
            )}
          </p>
          {corrections.length > 0 && (
            <ul aria-labelledby={heading} className="flex list-disc flex-col gap-3 pl-5">
              {corrections.map((finding) => (
                <li key={finding.code}>
                  <FindingLine finding={finding} syllables={syllables} kind={kind} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {corrections.length > 0 && (
        <CompareByEar
          onPlayWord={onPlayWord}
          onPlayTake={onPlayTake}
          playingWord={playingWord}
          playingTake={playingTake}
          kind={kind}
        />
      )}
    </section>
  )
}
