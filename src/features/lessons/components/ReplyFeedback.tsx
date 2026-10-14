import { Check, Lightbulb, MicOff, TriangleAlert } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { fillText, useT } from '@/shared/lib/i18n'
import type { ReplyCheck } from '../hooks/useReplyChecks'
import { revealOnMount } from '../lib/revealOnMount'

export type ReplyFeedbackProps = {
  /** What checking the reply came to. Nothing is drawn while the answer has not come. */
  check: ReplyCheck
  /** Who the learner was answering. */
  partnerName: string
}

/**
 * What the server made of a reply the learner gave in a role-play: the words it heard, whether
 * they answer the partner, and a better way to say them where there is one. It is a first
 * version: the words are a recogniser's guess, and a small model reads them. So nothing here is
 * called wrong. The icon and the words say what was found; the colour
 * only adds to them, and stays soft.
 *
 * **Whether a reply answers the partner is said only as a doubt, never as praise.** The model
 * says "it fits" far too readily (measured: it passed a sentence in Hindi), so its yes is not
 * told to a learner as "that answers". With no doubt and no better sentence, the card says only
 * that nothing was found to change, which is what happened.
 *
 * The better sentence is written, not said: a sound is kept by the server and the browser for
 * good, and this one is all but the learner's own words, which are kept nowhere.
 */
export function ReplyFeedback({ check, partnerName }: ReplyFeedbackProps) {
  const t = useT()
  if (check.status === 'checking') return null

  if (check.status === 'failed') {
    return (
      <p
        ref={revealOnMount}
        role="alert"
        className="flex animate-fade-in items-start gap-3 rounded-xl bg-warning-soft p-4 font-bold text-fg"
      >
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />
        {t(
          check.problem === 'tooMany'
            ? 'lessonDay.feedback.tooMany'
            : `lessonDay.reply.${check.problem}`,
        )}
      </p>
    )
  }

  const { heard, fits, better } = check.reply
  const right = heard !== null && fits === true && better === null
  const Icon = right ? Check : heard === null ? MicOff : Lightbulb

  return (
    <section
      ref={revealOnMount}
      aria-label={t('lessonDay.reply.title')}
      className={cn(
        'flex animate-fade-in flex-col gap-3 rounded-xl p-4 text-fg',
        right ? 'bg-success-soft' : 'bg-warning-soft',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface',
            right ? 'text-success' : 'text-warning',
          )}
        >
          <Icon className="size-5" strokeWidth={right ? 3 : 2} />
        </span>
        {heard === null ? (
          <p className="min-w-0 flex-1 font-extrabold">{t('lessonDay.reply.nothingHeard')}</p>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p>
              <span className="block text-sm font-extrabold">{t('lessonDay.reply.heard')}</span>
              <span lang="en" className="wrap-break-word">
                {heard}
              </span>
            </p>
            {fits === false && (
              <p className="font-extrabold">
                {fillText(t('lessonDay.reply.offTopic'), { name: partnerName })}
              </p>
            )}
            {right && <p className="font-extrabold">{t('lessonDay.reply.nothingToChange')}</p>}
            {better !== null && (
              <p>
                <span className="block text-sm font-extrabold">{t('lessonDay.reply.better')}</span>
                <span lang="en" className="font-bold wrap-break-word">
                  {better}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
