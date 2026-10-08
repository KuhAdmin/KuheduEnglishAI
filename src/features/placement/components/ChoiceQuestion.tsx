import { useEffect, useRef, useState } from 'react'
import { useHaptics } from '@/shared/hooks/useHaptics'
import { cn } from '@/shared/lib/cn'
import { fillText, useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { ChoiceList } from '@/shared/ui/ChoiceList'
import { useItemTranslation } from '../hooks/useItemTranslation'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import type { ChoiceItem } from '../lib/itemSchema'
import { usePlacementStore, type AnswerInput } from '../store/usePlacementStore'
import { AudioPrompt } from './AudioPrompt'
import { HelpPanel, type RevealedHelp } from './HelpPanel'
import { QuestionFooter } from './QuestionFooter'
import { TestFrame } from './TestFrame'

const SLOW_RATE = 0.75

export type ChoiceQuestionProps = {
  item: ChoiceItem
  onPause: () => void
}

/**
 * One Listen or Understand question. Nothing here says right or wrong — the learner answers
 * and moves on. Mounted afresh for each question, so its state starts empty.
 *
 * A Listen question is two screens in one. First Play alone, in the middle, and it stays that
 * way while the sentence plays. Once it has been heard through, the question and its answers
 * take over, with Play again and Play slowly at the top.
 */
export function ChoiceQuestion({ item, onPause }: ChoiceQuestionProps) {
  const t = useT()
  const haptic = useHaptics()
  const submitAnswer = usePlacementStore((state) => state.submitAnswer)
  const track = usePlacementStore((state) => state.track)
  const playback = useSpeechPlayback()
  const translation = useItemTranslation(item)

  const [selected, setSelected] = useState<number | null>(null)
  const [plays, setPlays] = useState({ normal: 0, slow: 0 })
  const [helpOpened, setHelpOpened] = useState(false)
  const [transcriptShown, setTranscriptShown] = useState(false)
  const [translationUsed, setTranslationUsed] = useState(false)
  const shownAt = useRef(0)
  useEffect(() => {
    shownAt.current = performance.now()
  }, [])

  const listening = item.stage === 'LISTEN'
  const heard = plays.normal + plays.slow > 0
  // Asking for help needs the room too, so it shows the question before anything was played.
  const opened = !listening || heard || helpOpened

  const play = async (slow: boolean) => {
    if (item.stage !== 'LISTEN') return
    track(heard ? 'placement_audio_replayed' : 'placement_audio_played')
    const outcome = await playback.play(item.audioText, slow ? SLOW_RATE : 1)
    if (outcome !== 'ended') return
    setPlays((count) =>
      slow ? { ...count, slow: count.slow + 1 } : { ...count, normal: count.normal + 1 },
    )
  }

  const finish = (answer: AnswerInput) => {
    playback.stop()
    submitAnswer({
      timeTakenMs: performance.now() - shownAt.current,
      playCount: plays.normal,
      slowPlayCount: plays.slow,
      helpOpened,
      transcriptShown,
      translationOffered: helpOpened && translation !== null,
      translationUsed,
      ...answer,
    })
  }

  const revealed: RevealedHelp[] = []
  if (transcriptShown && item.stage === 'LISTEN') {
    revealed.push({ label: t('placementTest.help.textLabel'), text: item.audioText, lang: 'en' })
  }
  if (translationUsed && translation) {
    revealed.push({
      label: translation.languageName,
      text: translation.text,
      lang: translation.language,
    })
  }

  return (
    <TestFrame
      title={t(
        listening ? 'placementTest.listen.instruction' : 'placementTest.understand.instruction',
      )}
      onPause={onPause}
      footer={
        <QuestionFooter
          canContinue={selected !== null}
          onContinue={() => finish({ answer: selected })}
          helpOpened={helpOpened}
          onOpenHelp={() => {
            setHelpOpened(true)
            track('placement_hint_used')
          }}
        />
      }
    >
      <div
        className={cn(
          'flex flex-1 flex-col gap-5',
          // The question screen fades in as one piece; nothing slides.
          opened ? listening && 'animate-fade-in' : 'justify-center',
        )}
      >
        {item.stage === 'LISTEN' && (
          <AudioPrompt
            status={playback.status}
            played={heard}
            onPlay={() => void play(false)}
            onPlaySlowly={() => void play(true)}
            onSkip={() => finish({ skipped: 'audioFailed' })}
          />
        )}
        {/* The questions themselves are English: they are what is being tested. */}
        {item.stage === 'UNDERSTAND' && item.context && (
          <p
            lang="en"
            className="rounded-lg bg-primary-soft px-4 py-3 text-xl font-bold text-on-primary-soft"
          >
            {item.context}
          </p>
        )}
        {opened && (
          <p lang="en" className="text-lg font-bold">
            {item.question}
          </p>
        )}

        {/* Answers only once the sentence has been heard, even if help was opened first. */}
        {(!listening || heard) && (
          <ChoiceList
            legend={t('placementTest.answers')}
            value={selected === null ? null : String(selected)}
            onChange={(value) => {
              haptic('tap')
              setSelected(Number(value))
            }}
            options={item.options.map((option, index) => ({
              value: String(index),
              label: <span lang="en">{option}</span>,
            }))}
          />
        )}

        {helpOpened && (
          <HelpPanel title={t('placementTest.help.title')} revealed={revealed}>
            {listening && !transcriptShown && (
              <Button variant="outline" fullWidth onClick={() => setTranscriptShown(true)}>
                {t('placementTest.help.showText')}
              </Button>
            )}
            {translation && !translationUsed && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => {
                  setTranslationUsed(true)
                  track('placement_translation_used')
                }}
              >
                {fillText(t('placementTest.help.translate'), {
                  language: translation.languageName,
                })}
              </Button>
            )}
            <Button variant="ghost" fullWidth onClick={() => finish({ skipped: 'notSure' })}>
              {t('placementTest.help.skip')}
            </Button>
          </HelpPanel>
        )}
      </div>
    </TestFrame>
  )
}
