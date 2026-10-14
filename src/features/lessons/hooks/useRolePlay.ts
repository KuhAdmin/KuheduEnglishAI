import { useEffect, useRef, useState } from 'react'
import { microphoneAllowed, primeMicrophonePermission } from '@/shared/lib/audio/microphone'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import {
  canListenForVoice,
  prepareListening,
  restListening,
} from '@/shared/lib/audio/voiceActivity'
import { turnCue, type WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { isEnglish, useLanguage } from '@/shared/lib/i18n'
import type { TurnHint } from '../components/TalkTranscript'
import { MAX_TURN_MS, turnTiming } from '../lib/turnTiming'
import { useReplyChecks } from './useReplyChecks'
import { useSpokenPractice } from './useSpokenPractice'
import { useTurnTakes } from './useTurnTakes'

/** Before the first line, while turns are being taken, and after the last one. */
export type RolePlayStage = 'intro' | 'talking' | 'done'

/**
 * How much help a turn comes with. `asked`: none until the learner asks, then what to say, then
 * the English. `shown`: what to say is there from the start of every turn, the English one
 * request away. `none`: no help at all; a reply is shown only once the turn is over.
 */
export type RolePlayHelp = 'shown' | 'asked' | 'none'

/** The turn's own limit ends a recording; the recorder's is only there in case it does not. */
const RECORDER_MARGIN_MS = 2_000

/**
 * A scripted conversation as the learner goes through it: the partner says a line with the
 * device's voice, the learner answers into the microphone (or skips), and the next line follows
 * whatever they said. **Every answer's recording is kept with its turn until the conversation is
 * started again or left** (`useTurnTakes`), so that each can be heard and checked afterwards,
 * when there is time to. A recording is only theirs to hear, unless they ask to have that reply
 * checked (`checkReply`): then it is sent to the server, on that tap and never by itself.
 *
 * Turns are taken without tapping where the device allows it: the microphone opens when the
 * partner's line ends (once the browser has been given the microphone, never to ask for it),
 * shuts if the learner does not begin, and a pause after speaking hands the turn back (see
 * `turnTiming`). "Speaking" is only sound louder than the room. A tap does all of it too.
 */
export function useRolePlay(roleplay: WeekRoleplay, help: RolePlayHelp = 'asked') {
  const language = useLanguage()
  const playback = useSpeechPlayback()
  const takes = useTurnTakes()
  /** The turn the recording now ending is the answer to; `null` when it was not ended as one. */
  const answering = useRef<number | null>(null)
  const { recording, startSpeaking, stopSpeaking, cancelSpeaking } = useSpokenPractice(
    // Neither the app's voice nor the learner's own may be recorded as their answer.
    () => {
      playback.stop()
      takes.stop()
    },
    {
      maxDurationMs: MAX_TURN_MS + RECORDER_MARGIN_MS,
      listen: true,
      onProgress: (progress) => {
        // Another recording is under way: whatever the one before it was for has come or gone.
        answering.current = null
        const { action } = turnTiming(progress)
        if (action === 'shut') cancelSpeaking()
        else if (action === 'answer') endTurn()
      },
      // Only a recording ended as an answer is kept: one cut off by the screen going dark is not.
      onTake: (made) => {
        const turn = answering.current
        answering.current = null
        if (turn !== null) takes.keep(turn, made)
      },
    },
  )
  const { turns } = roleplay
  const replies = useReplyChecks()

  const [stage, setStage] = useState<RolePlayStage>('intro')
  const [position, setPosition] = useState(0)
  // An admin may shorten the script while it is open; stay on its last turn.
  const turnIndex = Math.min(position, turns.length - 1)
  const turn = turns[turnIndex]
  // 0: no help yet; 1: what to say, in the learner's language; 2: the English as well.
  const [askedLevel, setAskedLevel] = useState<0 | 1 | 2>(0)
  const [partnerSaying, setPartnerSaying] = useState<number | null>(null)
  // The turns answered aloud; the others that are over were skipped.
  const [spoken, setSpoken] = useState<ReadonlySet<number>>(() => new Set())
  // Nothing may open the microphone while the learner decides whether to leave.
  const [held, setHeld] = useState(false)
  /** Goes up whenever a line is said or the learner turns to something else. */
  const lineRequest = useRef(0)

  useEffect(() => restListening, [])

  const micOpen = recording.phase === 'starting' || recording.phase === 'recording'
  const cue = turn && !isEnglish(language) ? turnCue(turn, language) : undefined
  // Help that is shown without asking starts every turn at its first step: the cue where there
  // is one, else the English.
  const givenLevel = help === 'shown' ? (cue ? 1 : 2) : 0
  const hintLevel = help === 'none' ? 0 : Math.max(askedLevel, givenLevel)

  /** `thenListen`: the line opens the learner's turn, so the microphone may follow it. */
  const sayPartner = (index: number, thenListen = false) => {
    const line = turns[index]
    if (!line) return
    const request = ++lineRequest.current
    // A microphone that failed is not tried again until the learner taps it.
    const mayListen = thenListen && !held && recording.problem === null
    takes.stop()
    setPartnerSaying(index)
    void playback.play(line.partner).then((outcome) => {
      // Cut short by another request: that one now says who is speaking.
      if (outcome !== 'cancelled') setPartnerSaying(null)
      if (
        outcome === 'ended' &&
        mayListen &&
        request === lineRequest.current &&
        microphoneAllowed() &&
        canListenForVoice()
      ) {
        startSpeaking()
      }
    })
  }

  /** Something the learner asked to hear again; it must not end up in a recording under way. */
  const hearAgain = (say: () => void) => {
    if (micOpen) recording.cancel()
    takes.stop()
    say()
  }

  const begin = () => {
    // Inside the tap, as iOS requires; the permission is only looked up, never asked for.
    prepareListening()
    primeMicrophonePermission()
    recording.reset()
    answering.current = null
    takes.clear()
    replies.clear()
    setSpoken(new Set())
    setHeld(false)
    setAskedLevel(0)
    setPosition(0)
    setStage('talking')
    sayPartner(0, true)
  }

  const advance = () => {
    setAskedLevel(0)
    if (turnIndex >= turns.length - 1) {
      playback.stop()
      setStage('done')
    } else {
      setPosition(turnIndex + 1)
      sayPartner(turnIndex + 1, true)
    }
  }

  /** Stopping a recording that captured something is the learner's answer: move on. */
  const endTurn = () => {
    const captured = recording.phase === 'recording'
    if (captured) answering.current = turnIndex
    stopSpeaking()
    if (captured) {
      setSpoken((turnsSpoken) => new Set(turnsSpoken).add(turnIndex))
      advance()
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
    /** The turns the learner answered aloud. */
    spoken,
    /** Their recordings, by the number of the turn: each can be played back, and checked. */
    takes: takes.takes,
    /** The turn whose recording is being played back. */
    playingTake: takes.playing,
    /** What checking a reply came to, by the number of its turn. */
    replyChecks: replies.checks,
    /** Whether a reply can be sent to be checked from this browser at all. */
    canCheckReply: replies.supported,
    /** Seconds on show while the microphone is open: to begin, or to the end of the turn. */
    countdown:
      recording.phase === 'recording'
        ? turnTiming({ elapsedMs: recording.elapsedMs, voice: recording.voice }).countdown
        : null,
    recording,
    canSpeak: isSpeechSupported(),
    /** The device has no voice, or failed to use it; the lines are written out all the same. */
    cannotSpeak: playback.status === 'failed' || !isSpeechSupported(),

    begin,
    askForHint: () => setAskedLevel(hintLevel === 0 && cue ? 1 : 2),
    replayPartner: (index: number) =>
      hearAgain(() => sayPartner(index, stage === 'talking' && index === turnIndex)),
    sayReply: (index: number) =>
      hearAgain(() => {
        const line = turns[index]
        if (!line) return
        setPartnerSaying(null)
        void playback.play(line.reply)
      }),
    /** They are listening, not answering: the microphone then waits for a tap. */
    listenToSelf: (index: number) => {
      lineRequest.current += 1
      if (micOpen) recording.cancel()
      // Their own voice and the app's are not heard over each other.
      playback.stop()
      takes.play(index)
    },
    /**
     * Send a reply to be checked. They have turned to what they said, as when they listen to
     * it: the microphone then waits for a tap, and the answer can be read.
     */
    checkReply: (index: number) => {
      const answered = turns[index]
      const take = takes.takes[index]
      if (!answered || !take) return
      lineRequest.current += 1
      if (micOpen) recording.cancel()
      void replies.check(index, take, { partner: answered.partner, suggested: answered.reply })
    },
    startTurn: () => {
      prepareListening()
      startSpeaking()
    },
    endTurn,
    skipTurn: () => {
      if (micOpen) recording.cancel()
      advance()
    },
    /** Quiet everything while the learner decides whether to leave. */
    pause: () => {
      setHeld(true)
      playback.stop()
      takes.stop()
      if (micOpen) recording.cancel()
    },
    resume: () => setHeld(false),
  }
}
