import { ChevronDown, LifeBuoy, Volume2 } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import { revealOnMount } from '../lib/revealOnMount'

export type PhraseHelpProps = {
  /** English phrases that fit the task. */
  phrases: readonly string[]
  open: boolean
  onToggle: () => void
  /** Say a phrase aloud. Called from a tap. Left out when the device cannot speak. */
  onPlay?: (phrase: string) => void
}

/**
 * Help for a task done without prompts: out of sight until asked for, so the learner tries on
 * their own first, and free to use — asking for it changes nothing else.
 */
export function PhraseHelp({ phrases, open, onToggle, onPlay }: PhraseHelpProps) {
  const t = useT()
  const listId = useId()

  return (
    <section className="flex flex-col gap-2">
      <Button
        variant="ghost"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className="self-start"
      >
        <LifeBuoy aria-hidden="true" className="size-5" />
        {t('lessonDay.perform.help')}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-5 transition-transform duration-(--duration-fast) ease-standard',
            open && 'rotate-180',
          )}
        />
      </Button>
      <div id={listId}>
        {open && (
          <ul
            // It opens under the button that was tapped, possibly out of sight.
            ref={revealOnMount}
            aria-label={t('lessonDay.perform.phrases')}
            className="flex animate-fade-in flex-col gap-1 rounded-xl bg-surface p-3 shadow-sm"
          >
            {phrases.map((phrase, index) => (
              <li key={index} className="flex min-h-11 items-center gap-2">
                <span lang="en" className="min-w-0 flex-1 wrap-break-word">
                  {phrase}
                </span>
                {onPlay && (
                  <IconButton
                    variant="secondary"
                    label={`${t('lessonDay.perform.playPhrase')}: ${phrase}`}
                    onClick={() => onPlay(phrase)}
                  >
                    <Volume2 aria-hidden="true" className="size-5" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
