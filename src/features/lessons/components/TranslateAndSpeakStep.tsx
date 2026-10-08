import { useEffect, useRef, useState } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { MicrophoneHelp } from '@/shared/lib/audio/MicrophoneHelp'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoiceAvailable } from '@/shared/lib/audio/useVoiceAvailable'
import { cn } from '@/shared/lib/cn'
import {
  acceptedAnswers,
  sentenceTips,
  sentenceTranslation,
  type WeekSentences,
} from '@/shared/lib/curriculum/weekSentences'
import { fillText, formatNumber, isEnglish, useLanguage, useT } from '@/shared/lib/i18n'
import { StepScreen } from '@/shared/ui/StepScreen'
import { useSpokenPractice } from '../hooks/useSpokenPractice'
import { revealOnMount } from '../lib/revealOnMount'
import { matchesAnswer } from '../lib/matchAnswer'
import { EnglishAnswer } from './EnglishAnswer'
import { LessonNextButton } from './LessonNextButton'
import { LessonTopBar } from './LessonTopBar'
import { PronunciationPractice } from './PronunciationPractice'
import { SentenceCard } from './SentenceCard'
import { TipsCard } from './TipsCard'
import { TranslationForm } from './TranslationForm'

export type TranslateAndSpeakStepProps = {
  sentences: WeekSentences
  /** This day's place in the week, e.g. 3 of 7. */
  day: number
  dayCount: number
  /** Where the back arrow leads: the week's overview. */
  backTo: string
  /** The learner finished this day before, so nothing is locked. */
  doneBefore: boolean
  /** The last sentence is done. */
  onNext: () => void
}

/**
 * Day 3, "Translate and speak": one sentence at a time, from the learner's language into
 * English, then said aloud. "Next" opens once the English is on show — typed right, or asked
 * for. Speaking is never required, and nothing said is rated. A learner with no mother tongue
 * to translate from (or a sentence not written in theirs) gets the English to listen to and say.
 */
export function TranslateAndSpeakStep({
  sentences,
  day,
  dayCount,
  backTo,
  doneBefore,
  onNext,
}: TranslateAndSpeakStepProps) {
  const t = useT()
  const language = useLanguage()
  const haptic = useHaptics()
  const playback = useSpeechPlayback()
  const { recording, startSpeaking, stopSpeaking } = useSpokenPractice(playback.stop)
  const list = sentences.sentences

  const [position, setPosition] = useState(0)
  // An admin may shorten the list while it is open; stay on its last sentence.
  const index = Math.min(position, list.length - 1)
  const sentence = list[index]
  const [typed, setTyped] = useState('')
  const [answerShown, setAnswerShown] = useState(false)
  const [matched, setMatched] = useState(false)

  // The screen stays while the sentence changes; moving focus to the heading announces it.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (index > 0) heading.current?.focus()
  }, [index])

  const source =
    sentence && !isEnglish(language) ? sentenceTranslation(sentence, language) : undefined
  const canSaySource = useVoiceAvailable(source === undefined ? undefined : language)
  if (!sentence) return null

  const tips = sentenceTips(sentence, language)
  const canContinue = doneBefore || answerShown || source === undefined

  const say = (text: string, lang?: string) => {
    // The device's voice must not end up in a recording that is under way.
    if (recording.phase !== 'recorded') recording.reset()
    void playback.play(text, 1, lang)
  }
  const sayEnglish = isSpeechSupported() ? () => say(sentence.english) : undefined

  const handleCheck = () => {
    const right = matchesAnswer(typed, acceptedAnswers(sentence))
    if (right) haptic('success')
    setMatched(right)
    setAnswerShown(true)
  }

  const handleNext = () => {
    if (index === list.length - 1) return onNext()
    // Another sentence is another attempt: what was typed, shown and recorded goes.
    playback.stop()
    recording.reset()
    setTyped('')
    setAnswerShown(false)
    setMatched(false)
    setPosition(index + 1)
  }

  return (
    <StepScreen
      eyebrow={
        list.length > 1
          ? fillText(t('lessonDay.translate.place'), {
              current: formatNumber(language, index + 1),
              total: formatNumber(language, list.length),
            })
          : undefined
      }
      title={t('lessonDay.translate.title')}
      subtitle={t(
        source === undefined
          ? 'lessonDay.translate.listenSubtitle'
          : 'lessonDay.translate.subtitle',
      )}
      headingRef={heading}
      topBar={<LessonTopBar backTo={backTo} day={day} dayCount={dayCount} />}
      footer={
        <LessonNextButton
          lockedBecause={canContinue ? null : t('lessonDay.translate.answerFirst')}
          onNext={handleNext}
        />
      }
    >
      <div
        key={index}
        className={cn('flex flex-col gap-4', index === 0 ? 'animate-rise-in' : 'animate-fade-in')}
      >
        {source === undefined ? (
          <SentenceCard
            label={t('lessonDay.translate.sentence')}
            text={sentence.english}
            lang="en"
            playLabel={t('lessonDay.translate.playSentence')}
            onPlay={sayEnglish}
          />
        ) : (
          <>
            <SentenceCard
              label={t('lessonDay.translate.sentence')}
              text={source}
              lang={language}
              playLabel={t('lessonDay.translate.playSentence')}
              onPlay={canSaySource ? () => say(source, language) : undefined}
            />
            <TranslationForm
              value={typed}
              onChange={(value) => {
                setTyped(value)
                // The tick belongs to what was checked, not to what is being typed now.
                setMatched(false)
              }}
              answerShown={answerShown}
              matched={matched}
              onCheck={handleCheck}
            />
            {answerShown && <EnglishAnswer english={sentence.english} onPlay={sayEnglish} />}
          </>
        )}

        {playback.status === 'failed' && (
          <p
            role="alert"
            className="rounded-md bg-warning-soft px-4 py-3 text-sm font-bold text-fg"
          >
            {t('lessonDay.translate.audioFailed')}
          </p>
        )}

        <PronunciationPractice
          title={t('lessonDay.translate.sayTitle')}
          phase={recording.phase}
          elapsedMs={recording.elapsedMs}
          firstTime={recording.attempts === 0}
          playingBack={recording.playing}
          onStart={startSpeaking}
          onStop={stopSpeaking}
          onListen={recording.playTake}
        />
        {recording.problem && (
          <div ref={revealOnMount}>
            <MicrophoneHelp problem={recording.problem} />
          </div>
        )}

        {tips.tips.length > 0 && (
          <TipsCard title={t('lessonDay.translate.tips')} tips={tips.tips} lang={tips.lang} />
        )}
      </div>
    </StepScreen>
  )
}
