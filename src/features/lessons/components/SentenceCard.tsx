import { Volume2 } from 'lucide-react'
import { IconButton } from '@/shared/ui/IconButton'

export type SentenceCardProps = {
  /** Names the card for assistive technology, e.g. "Sentence". */
  label: string
  text: string
  /** The language `text` is written in. */
  lang: string
  /** What the speaker button does, e.g. "Listen to the sentence". */
  playLabel: string
  /** Say the sentence aloud. Called from a tap. Left out when the device cannot say it. */
  onPlay?: () => void
}

/** The sentence a learner works on, large, with a button to hear it where that is possible. */
export function SentenceCard({ label, text, lang, playLabel, onPlay }: SentenceCardProps) {
  return (
    <section
      aria-label={label}
      className="flex items-center gap-3 rounded-xl bg-primary-soft p-4 text-on-primary-soft"
    >
      <p lang={lang} className="min-w-0 flex-1 text-xl font-extrabold wrap-break-word">
        {text}
      </p>
      {onPlay && (
        <IconButton variant="secondary" label={playLabel} onClick={onPlay} className="bg-surface">
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </section>
  )
}
