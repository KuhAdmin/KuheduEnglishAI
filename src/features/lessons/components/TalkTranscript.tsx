import { Headphones, Volume2 } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import type { RoleplayTurn } from '@/shared/lib/curriculum/weekRoleplays'
import { useT } from '@/shared/lib/i18n'
import { Button } from '@/shared/ui/Button'
import { IconButton } from '@/shared/ui/IconButton'
import type { ReplyCheck as Checked } from '../hooks/useReplyChecks'
import { clock } from '../lib/clock'
import { LearnerPicture } from './LearnerPicture'
import { PartnerAvatar } from './PartnerAvatar'
import { ReplyCheck } from './ReplyCheck'

/** The help a learner asked for on the turn they are answering. */
export type TurnHint = {
  /** What to say, in their own language. */
  cue?: { text: string; lang: string }
  /** The English they could say; shown once they ask for more than the cue. */
  reply?: string
}

export type TalkTranscriptProps = {
  /** Who the learner talks to, shown above each of the partner's lines. */
  partnerName: string
  /** The partner's own picture, when an admin gave them one; else the learner's tutor plays them. */
  partnerImageUrl: string | null
  turns: readonly RoleplayTurn[]
  /** How many of the partner's lines have been said so far. */
  opened: number
  /** How many of them the learner has answered, or skipped. */
  answered: number
  /** The turns answered aloud; the others that are over were skipped. */
  spoken: ReadonlySet<number>
  /** The learner's recordings that are kept, by the number of the turn each answered. */
  takes: Readonly<Record<number, { durationMs: number }>>
  /** The turn whose recording is being played back. */
  playingTake: number | null
  /** The help asked for on the turn being answered, if any. */
  hint: TurnHint | null
  /** The partner's line being said right now. */
  speakingTurn: number | null
  /** Say the partner's line again. Left out when the device cannot speak. */
  onReplay?: (turn: number) => void
  /** Say a turn's suggested reply. Left out when the device cannot speak. */
  onSayReply?: (turn: number) => void
  onListenToSelf: (turn: number) => void
  /** What checking a reply came to, by the number of its turn. */
  replyChecks?: Readonly<Record<number, Checked>>
  /** Send a turn's recording to be checked. Left out when this browser cannot send one. */
  onCheckReply?: (turn: number) => void
}

/**
 * The conversation so far, like a chat. **The partner's lines carry the partner's face**
 * (`PartnerAvatar`: the learner's tutor, lips moving on the line being said), which is where the
 * face is once the conversation has begun.
 *
 * **The learner's side shows what they did.** A turn they answered aloud is theirs: their
 * picture, "You answered", and their own recording to hear again, for as long as the
 * conversation is open. What they said is not known unless they ask to have it checked, so the
 * lesson's sentence is never shown as theirs: it sits under their recording as one they could
 * say, and what a check heard is shown under the bubble, apart (`ReplyCheck`). A turn they
 * skipped says so, has no picture, and shows only that sentence.
 *
 * New lines are announced to screen readers.
 */
export function TalkTranscript({
  partnerName,
  partnerImageUrl,
  turns,
  opened,
  answered,
  spoken,
  takes,
  playingTake,
  hint,
  speakingTurn,
  onReplay,
  onSayReply,
  onListenToSelf,
  replyChecks = {},
  onCheckReply,
}: TalkTranscriptProps) {
  const t = useT()
  const list = useRef<HTMLOListElement>(null)

  // Keep the newest line on screen as the conversation grows.
  useEffect(() => {
    const newest = list.current?.lastElementChild
    if (typeof newest?.scrollIntoView === 'function') newest.scrollIntoView({ block: 'nearest' })
  }, [opened, answered, hint?.cue, hint?.reply])

  /** A reply the learner could give, with a button to hear it. */
  const reply = (turn: RoleplayTurn, index: number) => (
    <span className="flex items-center gap-2">
      <span lang="en" className="min-w-0 flex-1 font-bold wrap-break-word">
        {turn.reply}
      </span>
      {onSayReply && (
        <IconButton
          variant="secondary"
          label={`${t('lessonDay.talk.playReply')}: ${turn.reply}`}
          onClick={() => onSayReply(index)}
          className="-my-1"
        >
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </span>
  )

  /** The lesson's own sentence for a turn that is over, named as one they could say. */
  const couldSay = (turn: RoleplayTurn, index: number) => (
    <>
      <span className="text-sm font-bold text-fg-muted">{t('lessonDay.talk.couldSay')}</span>
      {reply(turn, index)}
    </>
  )

  return (
    <ol
      ref={list}
      aria-label={t('lessonDay.talk.conversation')}
      aria-live="polite"
      className="flex flex-col gap-3"
    >
      {turns.slice(0, opened).map((turn, index) => {
        const take = takes[index]

        return (
          <Fragment key={index}>
            <li
              aria-current={speakingTurn === index ? 'true' : undefined}
              className="flex items-start gap-2"
            >
              <PartnerAvatar
                imageUrl={partnerImageUrl}
                speaking={speakingTurn === index}
                size="sm"
              />
              <span className="flex min-w-0 flex-col items-start gap-1">
                <span lang="en" className="flex items-center gap-1 px-1 text-sm font-extrabold">
                  {partnerName}
                  {/* Says "this one is being spoken" without relying on the face. */}
                  {speakingTurn === index && <Volume2 aria-hidden="true" className="size-4" />}
                </span>
                <span className="flex items-center gap-2 rounded-xl rounded-ss-sm bg-surface p-3 shadow-sm">
                  <span lang="en" className="min-w-0 flex-1 wrap-break-word">
                    {turn.partner}
                  </span>
                  {onReplay && (
                    <IconButton
                      variant="secondary"
                      label={`${t('lessonDay.talk.replay')}: ${turn.partner}`}
                      onClick={() => onReplay(index)}
                      className="-my-1"
                    >
                      <Volume2 aria-hidden="true" className="size-5" />
                    </IconButton>
                  )}
                </span>
              </span>
            </li>

            {index < answered && spoken.has(index) && (
              <li className="ms-8 flex flex-col items-end gap-1">
                <span className="flex items-center gap-2 px-1 text-sm font-extrabold">
                  {t('lessonDay.talk.youAnswered')}
                  <LearnerPicture />
                </span>
                <span className="flex flex-col gap-2 rounded-xl rounded-se-sm bg-primary-soft p-3 text-on-primary-soft">
                  {take && (
                    <span className="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={playingTake === index}
                        onClick={() => onListenToSelf(index)}
                      >
                        <Headphones aria-hidden="true" className="size-5" />
                        {t('lessonDay.practice.listen')}
                      </Button>
                      {/* How long they spoke; a detail for the eye. */}
                      <span aria-hidden="true" className="text-sm font-bold tabular-nums">
                        {clock(take.durationMs)}
                      </span>
                    </span>
                  )}
                  {/* Set apart inside their bubble: the lesson's sentence, not theirs. */}
                  <span className="flex flex-col gap-1 rounded-lg bg-surface px-3 py-2 text-fg">
                    {couldSay(turn, index)}
                  </span>
                </span>
                <ReplyCheck
                  check={replyChecks[index]}
                  onCheck={take && onCheckReply ? () => onCheckReply(index) : undefined}
                  partnerName={partnerName}
                />
              </li>
            )}

            {index < answered && !spoken.has(index) && (
              <li className="ms-8 flex flex-col items-end gap-1">
                <span className="px-1 text-sm font-extrabold text-fg-muted">
                  {t('lessonDay.talk.skipped')}
                </span>
                <span className="flex flex-col gap-1 rounded-xl rounded-se-sm bg-surface-sunken p-3">
                  {couldSay(turn, index)}
                </span>
              </li>
            )}

            {index === answered && hint && (
              <li className="ms-8 flex flex-col items-end gap-1">
                <span className="flex items-center gap-2 px-1 text-sm font-extrabold">
                  {t('lessonDay.talk.whatToSay')}
                  <LearnerPicture />
                </span>
                <span className="flex animate-fade-in flex-col gap-2 rounded-xl rounded-se-sm border-2 border-dashed border-primary bg-surface p-3">
                  {hint.cue && <span lang={hint.cue.lang}>{hint.cue.text}</span>}
                  {hint.reply && reply(turn, index)}
                </span>
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
