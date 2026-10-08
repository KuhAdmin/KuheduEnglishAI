import { Award } from 'lucide-react'

/**
 * The medal over a week's review, and over the end of its quiz and its flashcards: a small
 * celebration for coming back to practise. Decoration only.
 */
export function ReviewBadge() {
  return (
    <span className="flex size-16 animate-rise-in items-center justify-center rounded-full bg-accent-soft text-on-accent-soft shadow-sm">
      <Award aria-hidden="true" className="size-9" strokeWidth={1.75} />
    </span>
  )
}
