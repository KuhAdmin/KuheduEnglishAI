import { useT } from '@/shared/lib/i18n'
import { SyllableLine } from './SyllableLine'

export type StressComparisonProps = {
  /** The word's parts, as a lesson writes them: "nic(e)", "to", "meet", "you". */
  syllables: readonly string[]
  /** Which part is the strong one, counted from 1. */
  expected: number
  /** Which part sounded like the strong one in the recording. */
  heard: number
}

/**
 * Where the stress is and where it was put: the word's parts twice, one under the other, with
 * the strong one large in each. The sentence beside it says what to do; this shows what was
 * done, which the sentence leaves out. Each row is named, and its strong part says "Strong":
 * the difference is never left to size or colour.
 */
export function StressComparison({ syllables, expected, heard }: StressComparisonProps) {
  const t = useT()
  const rows = [
    { label: t('lessonDay.feedback.theWord'), stress: expected },
    { label: t('lessonDay.feedback.you'), stress: heard },
  ]

  return (
    <div className="flex flex-col gap-2">
      {rows.map(({ label, stress }) => (
        <div key={label} className="flex flex-col gap-1">
          {/* The row of parts is called this for a screen reader; said once. */}
          <p aria-hidden="true" className="text-sm font-bold">
            {label}
          </p>
          <SyllableLine syllables={syllables} stress={stress} label={label} withoutSilentNote />
        </div>
      ))}
    </div>
  )
}
