import { Check } from 'lucide-react'

export type OutcomeListProps = {
  /** Names the list, so the ticks are not taken for work already done. */
  label: string
  outcomes: readonly string[]
}

/** What the learner will be able to do by the end of a week. */
export function OutcomeList({ label, outcomes }: OutcomeListProps) {
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {outcomes.map((outcome, index) => (
        <li key={index} className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
          >
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="min-w-0 font-bold text-pretty">{outcome}</span>
        </li>
      ))}
    </ul>
  )
}
