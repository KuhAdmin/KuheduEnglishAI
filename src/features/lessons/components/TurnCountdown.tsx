import { cn } from '@/shared/lib/cn'
import { formatNumber, useLanguage } from '@/shared/lib/i18n'

export type TurnCountdownProps = {
  seconds: number
  /** The time is running out, as opposed to waiting for the learner to begin. */
  ending?: boolean
}

/**
 * The seconds left, beside the line that says what they are for. Hidden from screen readers,
 * which would read out every second: the line beside it is what they are told.
 */
export function TurnCountdown({ seconds, ending = false }: TurnCountdownProps) {
  const language = useLanguage()

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-base font-extrabold tabular-nums',
        ending ? 'bg-warning-soft text-fg' : 'bg-primary-soft text-on-primary-soft',
      )}
    >
      {formatNumber(language, seconds)}
    </span>
  )
}
