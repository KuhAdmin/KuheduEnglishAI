import { RotateCcw } from 'lucide-react'
import { useT } from '@/shared/lib/i18n'
import { useTutorAvatar } from '@/shared/lib/learner/tutorAvatar'
import { Button } from '@/shared/ui/Button'
import { TutorAvatar } from '@/shared/ui/TutorAvatar'
import { revealOnMount } from '../lib/revealOnMount'

export type TalkFinishProps = {
  /** The learner answered some turn aloud, so there are recordings above to go back to. */
  hasAnswers: boolean
  /** Start the conversation over. */
  onAgain: () => void
}

/**
 * The end of a conversation, under its last line: the learner's tutor with a thumbs up, the
 * praise, and where their own answers are. The tutor is the learner's own whoever played the
 * partner, so it is there with a partner an admin gave a picture too.
 *
 * "Practise again" is here and not among the pinned actions: going on is the one thing to do
 * next, and starting over is for someone who chooses to.
 */
export function TalkFinish({ hasAnswers, onAgain }: TalkFinishProps) {
  const t = useT()
  const avatar = useTutorAvatar()

  return (
    <div
      ref={revealOnMount}
      className="flex w-full animate-fade-in flex-col gap-3 rounded-xl bg-primary-soft p-4 text-on-primary-soft"
    >
      <div className="flex items-center gap-3">
        <TutorAvatar avatar={avatar} size="md" mood="encourage" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p role="status" className="text-lg font-extrabold text-balance">
            {t('lessonDay.talk.done')}
          </p>
          {hasAnswers && <p className="text-sm">{t('lessonDay.talk.doneReview')}</p>}
        </div>
      </div>
      <Button variant="outline" fullWidth onClick={onAgain}>
        <RotateCcw aria-hidden="true" className="size-5" />
        {t('lessonDay.talk.again')}
      </Button>
    </div>
  )
}
