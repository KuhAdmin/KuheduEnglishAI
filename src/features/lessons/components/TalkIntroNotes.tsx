import { useState } from 'react'
import { fillText, formatNumber, useLanguage, useT } from '@/shared/lib/i18n'
import { FitText } from '@/shared/ui/FitText'
import { PAUSE_ENDS_TURN_MS } from '../lib/turnTiming'

export type TalkIntroNotesProps = {
  /** A reply can be sent to be checked from this browser, so what checking does is said too. */
  canCheckReply: boolean
}

/**
 * What a learner is told before a role-play starts, so that neither the request for the
 * microphone is a surprise, nor a microphone that then opens by itself, nor a turn that ends on
 * a pause, **nor that having a reply checked sends its recording to our server**: the buttons
 * for that carry no note of their own, so this is where it is said first. The first note is one
 * line, drawn a little smaller where the phone is narrow; the ones under it, which are longer
 * and wrap, are drawn at that same size, so they read as one note.
 */
export function TalkIntroNotes({ canCheckReply }: TalkIntroNotesProps) {
  const t = useT()
  const language = useLanguage()
  // The size the first note was fitted at; its own while that is not known, or fits.
  const [fontSize, setFontSize] = useState<string>()

  return (
    <div className="flex flex-col gap-1 text-center text-sm text-fg-muted">
      <FitText onFit={setFontSize}>{t('lessonDay.practice.micNote')}</FitText>
      <p style={{ fontSize }}>
        {fillText(t('lessonDay.talk.autoMic'), {
          seconds: formatNumber(language, PAUSE_ENDS_TURN_MS / 1000),
        })}
      </p>
      {canCheckReply && <p style={{ fontSize }}>{t('lessonDay.reply.sends')}</p>}
    </div>
  )
}
