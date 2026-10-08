import { useState } from 'react'
import { MicrophoneHelp } from '@/shared/lib/audio/MicrophoneHelp'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { wordMeaning, type WeekVocabulary } from '@/shared/lib/curriculum/weekVocabulary'
import { isEnglish, useLanguage, useT } from '@/shared/lib/i18n'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useSpokenPractice } from '../hooks/useSpokenPractice'
import { revealOnMount } from '../lib/revealOnMount'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'
import { PronunciationPractice } from './PronunciationPractice'
import { WordCard } from './WordCard'

export type LearnWordsStepProps = {
  vocabulary: WeekVocabulary
  /** This day's place in the week, e.g. 2 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** The learner finished this day before, so nothing is locked. */
  doneBefore: boolean
  onNext: () => void
}

/**
 * Day 2, "Learn useful words": tap a word to hear it, then say it and listen to yourself.
 * "Next" opens once every word has been heard. Speaking is never required — a learner whose
 * microphone is blocked must not be stuck — and neither is listening on a device with no voice.
 */
export function LearnWordsStep({
  vocabulary,
  day,
  dayCount,
  backTo,
  doneBefore,
  onNext,
}: LearnWordsStepProps) {
  const t = useT()
  const language = useLanguage()
  const playback = useSpeechPlayback()
  const { recording, startSpeaking, stopSpeaking } = useSpokenPractice(playback.stop)
  const { words } = vocabulary

  const [selectedWord, setSelectedWord] = useState(words[0]?.word ?? '')
  // An admin may reword the list while it is open; fall back to its first word.
  const selected = words.find((entry) => entry.word === selectedWord) ?? words[0]
  const [heard, setHeard] = useState<ReadonlySet<string>>(new Set())
  const [saying, setSaying] = useState<string | null>(null)

  const cannotPlay = playback.status === 'failed' || !isSpeechSupported()
  const allHeard = words.every((entry) => heard.has(entry.word))
  const canContinue = doneBefore || allHeard || cannotPlay
  const meaningLang = isEnglish(language) ? undefined : language

  const handleSelect = async (word: string) => {
    // A new word starts a new attempt, and the device's voice must not be recorded as the
    // learner's own.
    if (word !== selected?.word || recording.phase !== 'recorded') recording.reset()
    setSelectedWord(word)
    setSaying(word)
    const outcome = await playback.play(word)
    if (outcome === 'ended') setHeard((before) => new Set(before).add(word))
    setSaying((current) => (current === word ? null : current))
  }

  return (
    <StepScreen
      title={t('lessonDay.words.title')}
      subtitle={t('lessonDay.words.subtitle')}
      topBar={<LessonTopBar backTo={backTo} day={day} dayCount={dayCount} />}
      footer={
        <div className="flex flex-col gap-3">
          {selected && (
            <PronunciationPractice
              word={selected.word}
              phase={recording.phase}
              elapsedMs={recording.elapsedMs}
              firstTime={recording.attempts === 0}
              playingBack={recording.playing}
              onStart={startSpeaking}
              onStop={stopSpeaking}
              onListen={recording.playTake}
            />
          )}
          <LessonNextButton
            lockedBecause={canContinue ? null : t('lessonDay.words.listenFirst')}
            onNext={onNext}
          />
        </div>
      }
    >
      <div className="flex animate-rise-in flex-col gap-4">
        {cannotPlay && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.words.audioFailed')}
          </p>
        )}

        <ul aria-label={t('lessonDay.words.list')} className="grid grid-cols-2 gap-3">
          {words.map((entry) => (
            <li key={entry.word}>
              <WordCard
                word={entry}
                meaning={meaningLang && wordMeaning(entry, meaningLang)}
                meaningLang={meaningLang}
                selected={entry.word === selected?.word}
                heard={heard.has(entry.word)}
                speaking={playback.status === 'playing' && saying === entry.word}
                heardLabel={t('lessonDay.words.heard')}
                onSelect={() => void handleSelect(entry.word)}
              />
            </li>
          ))}
        </ul>

        {recording.problem && (
          <div ref={revealOnMount}>
            <MicrophoneHelp problem={recording.problem} />
          </div>
        )}
      </div>
    </StepScreen>
  )
}
