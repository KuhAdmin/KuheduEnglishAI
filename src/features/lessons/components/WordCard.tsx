import { Check, Volume2 } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import type { VocabularyWord } from '@/shared/lib/curriculum/weekVocabulary'
import { WordPicture } from './WordPicture'

export type WordCardProps = {
  word: VocabularyWord
  /** What the word means in the learner's language, if it is written and they have one. */
  meaning?: string
  /** The language of `meaning`. */
  meaningLang?: string
  /** The word being practised. */
  selected: boolean
  /** The learner has heard it through. */
  heard: boolean
  /** The device's voice is saying it right now. */
  speaking: boolean
  /** Said after the word's name once it has been heard, e.g. "Heard". */
  heardLabel: string
  /** Hear the word, and make it the one to practise. Called from a tap. */
  onSelect: () => void
}

/**
 * One word to learn: its picture, how it is written and how it sounds. Tapping it says it.
 * The phonetic spelling is help for the eye; a screen reader is given the word and its meaning.
 */
export function WordCard({
  word,
  meaning,
  meaningLang,
  selected,
  heard,
  speaking,
  heardLabel,
  onSelect,
}: WordCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex h-full w-full flex-col items-center gap-1 rounded-xl border-2 bg-surface p-3 text-center',
        'transition-[transform,border-color] duration-(--duration-fast) ease-standard active:scale-97',
        selected ? 'border-primary shadow-sm' : 'border-transparent',
      )}
    >
      <span className="relative mb-1 size-24 shrink-0">
        <WordPicture word={word} />
        {/* A tick once heard, a speaker until then (and while it is being said): which words
            are left never rests on colour. */}
        <span
          className={cn(
            'absolute -end-2 -bottom-2 flex size-8 items-center justify-center rounded-full border-2 border-surface',
            heard && !speaking ? 'bg-success-soft text-success' : 'bg-primary text-on-primary',
          )}
        >
          {heard && !speaking ? (
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
          ) : (
            <Volume2 aria-hidden="true" className="size-4" />
          )}
        </span>
      </span>

      <span lang="en" className="font-extrabold wrap-break-word">
        {word.word}
      </span>
      {word.phonetic && (
        <span aria-hidden="true" lang="en" className="text-sm text-fg-muted">
          {word.phonetic}
        </span>
      )}
      {/* The spaces keep the parts of the name apart for every screen reader; they take no room. */}
      {meaning && (
        <>
          {' '}
          <span lang={meaningLang} className="text-sm">
            {meaning}
          </span>
        </>
      )}
      {heard && (
        <>
          {' '}
          <span className="sr-only">{heardLabel}</span>
        </>
      )}
    </button>
  )
}
