import { Headphones, Volume2 } from 'lucide-react'
import { Fragment, useEffect, useRef } from 'react'
import type { RoleplayTurn } from '@/shared/lib/curriculum/weekRoleplays'
import { useT } from '@/shared/lib/i18n'
import { IconButton } from '@/shared/ui/IconButton'

/** The help a learner asked for on the turn they are answering. */
export type TurnHint = {
  /** What to say, in their own language. */
  cue?: { text: string; lang: string }
  /** The English they could say; shown once they ask for more than the cue. */
  reply?: string
}

export type TalkTranscriptProps = {
  /** Who the learner talks to, shown above each of their lines. */
  partnerName: string
  turns: readonly RoleplayTurn[]
  /** How many of the partner's lines have been said so far. */
  opened: number
  /** How many of them the learner has answered, or skipped. */
  answered: number
  /** The help asked for on the turn being answered, if any. */
  hint: TurnHint | null
  /** The partner's line being said right now. */
  speakingTurn: number | null
  /** The turn the learner's own recording belongs to, while it is kept. */
  takeTurn: number | null
  /** Their recording is being played back. */
  playingTake: boolean
  /** Say the partner's line again. Left out when the device cannot speak. */
  onReplay?: (turn: number) => void
  /** Say a turn's suggested reply. Left out when the device cannot speak. */
  onSayReply?: (turn: number) => void
  onListenToSelf: () => void
}

/**
 * The conversation so far, like a chat: the partner's lines on one side and, once a turn is
 * answered, a reply the learner could have given on the other. What the learner actually said
 * is not known — nothing recognises speech yet — so the reply is offered as one they could say,
 * never as theirs. New lines are announced to screen readers.
 */
export function TalkTranscript({
  partnerName,
  turns,
  opened,
  answered,
  hint,
  speakingTurn,
  takeTurn,
  playingTake,
  onReplay,
  onSayReply,
  onListenToSelf,
}: TalkTranscriptProps) {
  const t = useT()
  const list = useRef<HTMLOListElement>(null)

  // Keep the newest line on screen as the conversation grows.
  useEffect(() => {
    const newest = list.current?.lastElementChild
    if (typeof newest?.scrollIntoView === 'function') newest.scrollIntoView({ block: 'nearest' })
  }, [opened, answered, hint?.cue, hint?.reply])

  /** A reply the learner could give, with a button to hear it; `onSoft` inside a tinted bubble. */
  const reply = (turn: RoleplayTurn, index: number, onSoft: boolean) => (
    <span className="flex items-center gap-2">
      <span lang="en" className="min-w-0 flex-1 font-bold wrap-break-word">
        {turn.reply}
      </span>
      {onSayReply && (
        <IconButton
          variant="secondary"
          label={`${t('lessonDay.talk.playReply')}: ${turn.reply}`}
          onClick={() => onSayReply(index)}
          className={onSoft ? '-my-1 bg-surface' : '-my-1'}
        >
          <Volume2 aria-hidden="true" className="size-5" />
        </IconButton>
      )}
    </span>
  )

  return (
    <ol
      ref={list}
      aria-label={t('lessonDay.talk.conversation')}
      aria-live="polite"
      className="flex flex-col gap-3"
    >
      {turns.slice(0, opened).map((turn, index) => (
        <Fragment key={index}>
          <li
            aria-current={speakingTurn === index ? 'true' : undefined}
            className="me-8 flex flex-col items-start gap-1"
          >
            <span lang="en" className="flex items-center gap-1 px-1 text-sm font-extrabold">
              {partnerName}
              {/* Says "this one is being spoken" without relying on the avatar's ring. */}
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
          </li>

          {index < answered && (
            <li className="ms-8 flex flex-col items-end gap-1">
              <span className="px-1 text-sm font-extrabold">{t('lessonDay.talk.couldSay')}</span>
              <span className="flex flex-col gap-2 rounded-xl rounded-se-sm bg-primary-soft p-3 text-on-primary-soft">
                {reply(turn, index, true)}
                {takeTurn === index && (
                  <IconButton
                    variant="secondary"
                    label={t('lessonDay.practice.listen')}
                    disabled={playingTake}
                    onClick={onListenToSelf}
                    className="self-end bg-surface"
                  >
                    <Headphones aria-hidden="true" className="size-5" />
                  </IconButton>
                )}
              </span>
            </li>
          )}

          {index === answered && hint && (
            <li className="ms-8 flex flex-col items-end gap-1">
              <span className="px-1 text-sm font-extrabold">{t('lessonDay.talk.whatToSay')}</span>
              <span className="flex animate-fade-in flex-col gap-2 rounded-xl rounded-se-sm border-2 border-dashed border-primary bg-surface p-3">
                {hint.cue && <span lang={hint.cue.lang}>{hint.cue.text}</span>}
                {hint.reply && reply(turn, index, false)}
              </span>
            </li>
          )}
        </Fragment>
      ))}
    </ol>
  )
}
