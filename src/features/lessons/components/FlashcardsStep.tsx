import { Check, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { cn } from '@/shared/lib/cn'
import { wordMeaning, type WeekVocabulary } from '@/shared/lib/curriculum/weekVocabulary'
import { fillText, formatNumber, isEnglish, useLanguage, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { StepScreen } from '@/shared/ui/StepScreen'
import { Flashcard } from './Flashcard'
import { LessonTopBar } from './LessonTopBar'
import { ReviewPartDone } from './ReviewPartDone'

export type FlashcardsStepProps = {
  /** The week's words: the ones Day 2 taught. */
  vocabulary: WeekVocabulary
  /** This day's place in the week, e.g. 6 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the review's list. */
  backTo: string
  backLabel: string
  /** Every card has been put away, and the learner goes on. */
  onNext: () => void
}

/**
 * The flashcards of a week's review: the week's words one at a time, from their meaning to the
 * English. The learner says the word, turns the card to see and hear it, and sorts it
 * themselves: "I know it" puts the card away, "Practise again" sends it to the back of the pile.
 * Nothing is rated; the pile is done when every card has been put away.
 */
export function FlashcardsStep({
  vocabulary,
  day,
  dayCount,
  backTo,
  backLabel,
  onNext,
}: FlashcardsStepProps) {
  const t = useT()
  const language = useLanguage()
  const playback = useSpeechPlayback()
  const { words } = vocabulary

  const inOrder = () => words.map((_, index) => index)
  // Positions of the words still in the pile, the one on screen first.
  const [pile, setPile] = useState(inOrder)
  const [turned, setTurned] = useState(false)
  // Cards shown so far: a new one moves focus to itself, so that it is announced.
  const [turn, setTurn] = useState(0)
  const card = useRef<HTMLElement>(null)
  useEffect(() => {
    if (turn > 0) card.current?.focus()
  }, [turn])

  const topBar = (
    <LessonTopBar backTo={backTo} backLabel={backLabel} day={day} dayCount={dayCount} />
  )
  const startOver = () => {
    setPile(inOrder())
    setTurned(false)
    setTurn((before) => before + 1)
  }

  // An admin may shorten the list while it is open; a word that went is not shown.
  const word = pile[0] === undefined ? undefined : words[pile[0]]
  if (!word) {
    return (
      <ReviewPartDone
        title={t('lessonDay.cards.doneTitle')}
        subtitle={t('lessonDay.cards.doneSubtitle')}
        topBar={topBar}
        againLabel={t('lessonDay.cards.restart')}
        onAgain={startOver}
        onNext={onNext}
      />
    )
  }

  const meaning = isEnglish(language) ? undefined : wordMeaning(word, language)
  // With no meaning to start from there is nothing to turn: the English is the card.
  const shown = turned || meaning === undefined
  const say = isSpeechSupported() ? () => void playback.play(word.word) : undefined

  const handleSort = (again: boolean) => {
    playback.stop()
    setPile((before) => (again ? [...before.slice(1), ...before.slice(0, 1)] : before.slice(1)))
    setTurned(false)
    setTurn((before) => before + 1)
  }

  return (
    <StepScreen
      eyebrow={fillText(t('lessonDay.cards.left'), { count: formatNumber(language, pile.length) })}
      title={t('lessonDay.review.flashcards')}
      subtitle={t(
        meaning === undefined ? 'lessonDay.cards.listenSubtitle' : 'lessonDay.cards.subtitle',
      )}
      topBar={topBar}
      footer={
        shown ? (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" size="lg" fullWidth onClick={() => handleSort(true)}>
              <RotateCcw aria-hidden="true" className="size-5" />
              {t('lessonDay.cards.again')}
            </Button>
            <Button size="lg" fullWidth onClick={() => handleSort(false)}>
              <Check aria-hidden="true" className="size-5" strokeWidth={3} />
              {t('lessonDay.cards.known')}
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            fullWidth
            onClick={() => {
              setTurned(true)
              // Turning the card is a tap, so the device may say the word with it.
              say?.()
            }}
          >
            {t('lessonDay.cards.show')}
          </Button>
        )
      }
    >
      <div
        key={turn}
        className={cn(
          'flex flex-1 flex-col gap-4',
          turn === 0 ? 'animate-rise-in' : 'animate-fade-in',
        )}
      >
        <Flashcard
          word={word}
          meaning={meaning}
          meaningLang={meaning === undefined ? undefined : language}
          shown={shown}
          onPlay={say}
          cardRef={card}
        />
        {playback.status === 'failed' && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.words.audioFailed')}
          </p>
        )}
      </div>
    </StepScreen>
  )
}
