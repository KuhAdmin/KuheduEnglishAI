import { useState } from 'react'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { turnCue, type WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { isEnglish, useLanguage } from '@/shared/lib/i18n'
import type { TurnHint } from '../components/TalkTranscript'
import { useSpokenPractice } from './useSpokenPractice'

/** Before the first line, while turns are being taken, and after the last one. */
export type RolePlayStage = 'intro' | 'talking' | 'done'

/**
 * How much help a turn comes with. `asked`: none until the learner asks, then what to say, then
 * the English. `shown`: what to say is there from the start of every turn, the English one
 * request away. `none`: no help at all; a reply is shown only once the turn is over.
 */
export type RolePlayHelp = 'shown' | 'asked' | 'none'

/**
 * A scripted conversation as the learner goes through it: the partner says a line with the
 * device's voice, the learner answers into the microphone (or skips), and the next line follows.
 * Nothing the learner says is recognised or rated, and the recording is only theirs to hear.
 *
 * The partner's next line is started inside the tap that ended the learner's turn, because
 * browsers (iOS above all) only let speech start from a tap.
 */
export function useRolePlay(roleplay: WeekRoleplay, help: RolePlayHelp = 'asked') {
  const language = useLanguage()
  const playback = useSpeechPlayback()
  const { recording, startSpeaking, stopSpeaking } = useSpokenPractice(playback.stop)
  const { turns } = roleplay

  const [stage, setStage] = useState<RolePlayStage>('intro')
  const [position, setPosition] = useState(0)
  // An admin may shorten the script while it is open; stay on its last turn.
  const turnIndex = Math.min(position, turns.length - 1)
  const turn = turns[turnIndex]
  // 0: no help yet; 1: what to say, in the learner's language; 2: the English as well.
  const [askedLevel, setAskedLevel] = useState<0 | 1 | 2>(0)
  const [partnerSaying, setPartnerSaying] = useState<number | null>(null)
  const [takeTurn, setTakeTurn] = useState<number | null>(null)

  const micOpen = recording.phase === 'starting' || recording.phase === 'recording'
  const cue = turn && !isEnglish(language) ? turnCue(turn, language) : undefined
  // Help that is shown without asking starts every turn at its first step: the cue where there
  // is one, else the English.
  const givenLevel = help === 'shown' ? (cue ? 1 : 2) : 0
  const hintLevel = help === 'none' ? 0 : Math.max(askedLevel, givenLevel)

  const sayPartner = (index: number) => {
    const line = turns[index]
    if (!line) return
    setPartnerSaying(index)
    void playback.play(line.partner).then((outcome) => {
      // Cut short by another request: that one now says who is speaking.
      if (outcome !== 'cancelled') setPartnerSaying(null)
    })
  }

  /** Something the learner asked to hear again; it must not end up in a recording under way. */
  const hearAgain = (say: () => void) => {
    if (micOpen) recording.reset()
    say()
  }

  const begin = () => {
    recording.reset()
    setTakeTurn(null)
    setAskedLevel(0)
    setPosition(0)
    setStage('talking')
    sayPartner(0)
  }

  const advance = () => {
    setAskedLevel(0)
    if (turnIndex >= turns.length - 1) {
      playback.stop()
      setStage('done')
    } else {
      setPosition(turnIndex + 1)
      sayPartner(turnIndex + 1)
    }
  }

  const hint: TurnHint | null =
    stage === 'talking' && turn && hintLevel > 0
      ? { cue, reply: hintLevel === 2 ? turn.reply : undefined }
      : null

  return {
    stage,
    /** How many of the partner's lines have been said, and how many the learner has answered. */
    opened: stage === 'intro' ? 0 : stage === 'done' ? turns.length : turnIndex + 1,
    answered: stage === 'done' ? turns.length : turnIndex,
    hint,
    /** The first tap gives the cue where there is one; the next gives the English. */
    moreHelpLeft: hintLevel === 1,
    noHelpLeft: hintLevel === 2,
    speakingTurn: playback.status === 'playing' ? partnerSaying : null,
    /** The turn whose recording can be played back; a take is dropped when another begins. */
    takeTurn: recording.phase === 'recorded' ? takeTurn : null,
    recording,
    canSpeak: isSpeechSupported(),
    /** The device has no voice, or failed to use it; the lines are written out all the same. */
    cannotSpeak: playback.status === 'failed' || !isSpeechSupported(),

    begin,
    askForHint: () => setAskedLevel(hintLevel === 0 && cue ? 1 : 2),
    replayPartner: (index: number) => hearAgain(() => sayPartner(index)),
    sayReply: (index: number) =>
      hearAgain(() => {
        const line = turns[index]
        if (!line) return
        setPartnerSaying(null)
        void playback.play(line.reply)
      }),
    startTurn: () => {
      setTakeTurn(null)
      startSpeaking()
    },
    /** Stopping a recording that captured something is the learner's answer: move on. */
    endTurn: () => {
      const captured = recording.phase === 'recording'
      stopSpeaking()
      if (captured) {
        setTakeTurn(turnIndex)
        advance()
      }
    },
    skipTurn: () => {
      if (micOpen) recording.reset()
      advance()
    },
    /** Quiet everything, e.g. while the learner decides whether to leave. */
    pause: () => {
      playback.stop()
      if (micOpen) recording.reset()
    },
  }
}
