import { Volume2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { lineTranslation, type DialogueLine } from '@/shared/lib/curriculum/weekDialogues'
import { IconButton } from '@/shared/ui/IconButton'

export type DialogueLinesProps = {
  /** Names the list. */
  label: string
  lines: readonly DialogueLine[]
  /**
   * `null` shows the lines in English, each with a button to hear it again. A language shows
   * each line with its translation underneath instead (the transcript).
   */
  translateTo: string | null
  /** The line being said right now, if any. */
  currentLine: number | null
  /** What the button of a line does; the line itself is added to it. */
  playLineLabel: string
  onPlayLine: (index: number) => void
}

/** A conversation written out, speaker by speaker. The lines are English content. */
export function DialogueLines({
  label,
  lines,
  translateTo,
  currentLine,
  playLineLabel,
  onPlayLine,
}: DialogueLinesProps) {
  const current = useRef<HTMLLIElement>(null)

  // Keep the line being said on screen while the conversation plays through.
  useEffect(() => {
    const line = current.current
    if (currentLine !== null && typeof line?.scrollIntoView === 'function') {
      line.scrollIntoView({ block: 'nearest' })
    }
  }, [currentLine])

  return (
    <ol aria-label={label} className="flex flex-col gap-1">
      {lines.map((line, index) => {
        const speaking = index === currentLine
        const translation = translateTo === null ? undefined : lineTranslation(line, translateTo)

        return (
          <li
            key={index}
            ref={speaking ? current : undefined}
            aria-current={speaking ? 'true' : undefined}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2',
              'transition-colors duration-(--duration-fast) ease-standard',
              speaking && 'bg-primary-soft text-on-primary-soft',
            )}
          >
            <span className="flex w-18 shrink-0 flex-col gap-1 pt-0.5">
              <span lang="en" className="text-sm font-extrabold wrap-break-word">
                {line.speaker}
              </span>
              {/* Says "this one is being spoken" without relying on the highlight's colour. */}
              {speaking && <Volume2 aria-hidden="true" className="size-4" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span lang="en">{line.text}</span>
              {translation && (
                <span
                  lang={translateTo ?? undefined}
                  className={cn('text-sm', !speaking && 'text-fg-muted')}
                >
                  {translation}
                </span>
              )}
            </span>
            {translateTo === null && (
              <IconButton
                variant="secondary"
                label={`${playLineLabel}: ${line.text}`}
                onClick={() => onPlayLine(index)}
                className="-my-1"
              >
                <Volume2 aria-hidden="true" className="size-5" />
              </IconButton>
            )}
          </li>
        )
      })}
    </ol>
  )
}
