import { Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export type ChecklistTask = {
  text: string
  /** The language `text` is written in. */
  lang: string
}

export type TaskChecklistProps = {
  /** Names the list, e.g. "What to do". */
  label: string
  tasks: readonly ChecklistTask[]
  /**
   * `false` while the tasks are still to be done: a plain list. `true` once the learner can
   * judge their attempt: each task becomes a tick box of their own.
   */
  tickable: boolean
  /** Positions of the tasks the learner ticked. */
  ticked: ReadonlySet<number>
  onToggle: (index: number) => void
}

const rowClass = 'flex min-h-11 items-center gap-3 rounded-lg px-2'
const markerClass =
  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border-strong'
const textClass = 'min-w-0 flex-1 font-bold wrap-break-word'

/**
 * What a challenge asks for. Before the attempt it is a list to read, with empty circles so
 * that nothing looks done already; after it, the learner ticks what they managed. The ticks are
 * theirs alone: nothing here assesses the attempt.
 */
export function TaskChecklist({ label, tasks, tickable, ticked, onToggle }: TaskChecklistProps) {
  return (
    <ul aria-label={label} className="flex flex-col">
      {tasks.map((task, index) =>
        tickable ? (
          <li key={index}>
            <label
              className={cn(
                rowClass,
                // `relative` keeps the hidden tick box inside its row, so it scrolls with the row.
                'relative cursor-pointer transition-colors duration-(--duration-fast) ease-standard active:bg-surface-sunken',
                'has-focus-visible:outline-2 has-focus-visible:outline-offset-0 has-focus-visible:outline-focus',
              )}
            >
              <input
                type="checkbox"
                checked={ticked.has(index)}
                onChange={() => onToggle(index)}
                className="peer sr-only"
              />
              {/* The tick itself says "done"; the colour only adds to it. */}
              <span
                aria-hidden="true"
                className={cn(
                  markerClass,
                  'text-transparent peer-checked:border-success peer-checked:bg-success peer-checked:text-surface',
                )}
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
              <span lang={task.lang} className={textClass}>
                {task.text}
              </span>
            </label>
          </li>
        ) : (
          <li key={index} className={rowClass}>
            <span aria-hidden="true" className={markerClass} />
            <span lang={task.lang} className={textClass}>
              {task.text}
            </span>
          </li>
        ),
      )}
    </ul>
  )
}
