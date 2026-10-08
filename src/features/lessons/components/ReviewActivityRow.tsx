import { Check, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, type To } from 'react-router'
import { cn } from '@/shared/lib/cn'

export type ReviewActivityRowProps = {
  /** Opens the activity. */
  to: To
  /** Shown in a tinted square. Decorative: the title names the activity. */
  icon: ReactNode
  /** Which of the two tints the square has, so neighbouring rows differ at a glance. */
  tone: 'primary' | 'accent'
  title: string
  /** What the activity holds, e.g. "A new conversation". */
  about: ReactNode
  /** The learner has done it. */
  done: boolean
  /** Said after the title once it is done, e.g. "Done". */
  doneLabel: string
}

/** One activity of a week's review: tap to open it; a tick once it has been done. */
export function ReviewActivityRow({
  to,
  icon,
  tone,
  title,
  about,
  done,
  doneLabel,
}: ReviewActivityRowProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex min-h-18 items-center gap-3 rounded-xl bg-surface px-3 py-2 shadow-sm',
        'transition-transform duration-(--duration-fast) ease-standard active:scale-98',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-lg',
          tone === 'primary'
            ? 'bg-primary-soft text-on-primary-soft'
            : 'bg-accent-soft text-on-accent-soft',
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-extrabold wrap-break-word">{title}</span>
        {/* The spaces keep the parts of the name apart for every screen reader. */}{' '}
        <span className="text-sm wrap-break-word text-fg-muted">{about}</span>
        {done && (
          <>
            {' '}
            <span className="sr-only">{doneLabel}</span>
          </>
        )}
      </span>
      {/* A tick once done, an arrow until then: what is left never rests on colour. */}
      {done ? (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
        >
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : (
        <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-fg-subtle" />
      )}
    </Link>
  )
}
