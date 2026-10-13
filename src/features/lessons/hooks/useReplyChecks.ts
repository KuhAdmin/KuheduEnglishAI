import { REPLY_SAMPLE_RATE, REPLY_SECONDS_MAX, type ReplyAssessment } from '@kuhedu/contracts'
import { useCallback, useRef, useState } from 'react'
import type { Take } from '@/shared/lib/audio/useVoiceRecording'
import { canMakeWav, recordingToWav } from '@/shared/lib/audio/wav'
import { checkReply, type TurnAnswered } from '../api/reply'
import { problemOf, type CheckProblem } from './usePronunciationCheck'

export type ReplyCheck =
  | { status: 'checking' }
  | { status: 'done'; reply: ReplyAssessment }
  | { status: 'failed'; problem: CheckProblem }

/**
 * Having the server check the learner's replies in one conversation, each when they ask. What a
 * check came to stays with its turn after the recording itself has gone (only the last answer's
 * is kept), until the conversation is started again.
 */
export function useReplyChecks() {
  const [checks, setChecks] = useState<Readonly<Record<number, ReplyCheck>>>({})
  // Goes up when the conversation starts again: an answer for the one before is not shown.
  const conversation = useRef(0)

  const check = useCallback(async (turn: number, take: Take, answered: TurnAnswered) => {
    const asked = conversation.current
    const settle = (result: ReplyCheck) => {
      if (conversation.current === asked) setChecks((all) => ({ ...all, [turn]: result }))
    }
    settle({ status: 'checking' })

    let wav: Blob
    try {
      // The take is kept by its address in this page's memory; these are its bytes.
      const recording = await (await fetch(take.url)).blob()
      wav = await recordingToWav(recording, REPLY_SAMPLE_RATE, REPLY_SECONDS_MAX)
    } catch {
      // The browser cannot read back what it recorded: there is nothing to send.
      settle({ status: 'failed', problem: 'unreadable' })
      return
    }
    try {
      settle({ status: 'done', reply: await checkReply(wav, answered) })
    } catch (error) {
      settle({ status: 'failed', problem: problemOf(error) })
    }
  }, [])

  const clear = useCallback(() => {
    conversation.current += 1
    setChecks({})
  }, [])

  return {
    /** Whether this browser can send a recording at all. */
    supported: canMakeWav(),
    /** What checking came to, by the number of the turn. */
    checks,
    check,
    clear,
  }
}
