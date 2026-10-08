import { Volume2 } from 'lucide-react'
import type { Ref } from 'react'
import type { VocabularyWord } from '@/shared/lib/curriculum/weekVocabulary'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'
import { WordPicture } from './WordPicture'

export type FlashcardProps = {
  word: VocabularyWord
  /** What the word means in the learner's language: the side of the card they start from. */
  meaning?: string
  /** The language of `meaning`. */
  meaningLang?: string
  /** The English side is up. */
  shown: boolean
  /** Say the word aloud. Called from a tap. Left out when the device has no voice. */
  onPlay?: () => void
  /** Lets the caller move focus to the card when another one takes its place. */
  cardRef?: Ref<HTMLElement>
}

/**
 * One word to recall: its meaning (and picture) first, the English once the card is turned. A
 * learner with no meaning to start from gets the English at once, to hear and say.
 */
export function Flashcard({ word, meaning, meaningLang, shown, onPlay, cardRef }: FlashcardProps) {
  const t = useT()

  return (
    <section
      ref={cardRef}
      // Focusable by script only, so the next card is announced when focus moves to it.
      tabIndex={-1}
      className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-surface p-6 text-center shadow-md outline-none"
    >
      <span className="size-28 shrink-0">
        <WordPicture word={word} />
      </span>

      {meaning && (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-extrabold text-fg-muted">{t('lessonDay.cards.prompt')}</p>
          <p lang={meaningLang} className="text-2xl font-extrabold wrap-break-word">
            {meaning}
          </p>
        </div>
      )}

      {/* Always there, so that the word is announced when the card is turned. */}
      <div aria-live="polite" className="flex flex-col items-center gap-1 empty:hidden">
        {shown && (
          <>
            {meaning && (
              <p className="text-sm font-extrabold text-fg-muted">{t('lessonDay.cards.word')}</p>
            )}
            <p lang="en" className="text-3xl font-extrabold wrap-break-word text-primary">
              {word.word}
            </p>
            {word.phonetic && (
              <p aria-hidden="true" lang="en" className="text-fg-muted">
                {word.phonetic}
              </p>
            )}
          </>
        )}
      </div>

      {shown && onPlay && (
        <IconButton
          variant="secondary"
          label={`${t('lessonDay.cards.play')}: ${word.word}`}
          onClick={onPlay}
        >
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </section>
  )
}
