import { formatNumber, useLanguage, useT } from '@/shared/lib/i18n'

export type PartBeatsProps = {
  /** How many parts the word is said in. */
  expected: number
  /** How many were heard in the recording. */
  heard: number
}

/** More than this is not a count anyone reads at a glance; the number beside the row says it. */
const MOST_BEATS = 8

/**
 * A word's parts as beats, and the beats that were heard: a dot for each, one row under the
 * other. Which part was the extra one, or the missing one, is not known, so the beats are not
 * the word's own parts and none of them is marked.
 */
export function PartBeats({ expected, heard }: PartBeatsProps) {
  const t = useT()
  const language = useLanguage()
  const rows = [
    { label: t('lessonDay.feedback.theWord'), count: expected },
    { label: t('lessonDay.feedback.you'), count: heard },
  ]

  return (
    <div className="flex flex-col gap-1">
      {rows.map(({ label, count }) => (
        <div
          key={label}
          role="img"
          aria-label={`${label}: ${formatNumber(language, count)}`}
          className="flex items-center gap-2"
        >
          {/* As wide as the longer label in most languages, and wider when the text is made larger. */}
          <span className="min-w-16 shrink-0 text-sm font-bold">{label}</span>
          <span className="flex flex-wrap items-center gap-1">
            {Array.from({ length: Math.min(count, MOST_BEATS) }, (_, beat) => (
              <span key={beat} className="size-3 rounded-full bg-fg" />
            ))}
          </span>
          <span className="text-sm font-bold">{formatNumber(language, count)}</span>
        </div>
      ))}
    </div>
  )
}
