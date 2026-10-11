import { useEffect } from 'react'
import { isSpeechSupported } from '@/shared/lib/audio/speech'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoiceAvailable } from '@/shared/lib/audio/useVoiceAvailable'
import { isEnglish, useLanguage } from '@/shared/lib/i18n'
import { useTutorSoundStore } from './useTutorSoundStore'

/**
 * Browsers let no sound start before the learner has touched the page since it was opened. A
 * browser that does not say whether they have is simply tried.
 */
function soundMayStart(): boolean {
  if (typeof navigator === 'undefined' || !navigator.userActivation) return true
  return navigator.userActivation.hasBeenActive
}

/**
 * The tutor saying a line of its own, in the language it is written in: by itself when the
 * screen opens and whenever the line changes, unless the learner muted it. What is heard is
 * always what is read: a device with no voice for that language says nothing — the line is
 * neither read by another language's voice nor said in another language — and a line that could
 * not start (before the first tap; where a browser only speaks inside one) is no error: it
 * stays written and can be asked for.
 */
export function useTutorNarration(line: string) {
  const language = useLanguage()
  const { status, play, stop } = useSpeechPlayback()
  const muted = useTutorSoundStore((state) => state.muted)
  const setMuted = useTutorSoundStore((state) => state.setMuted)

  // English is what the device's voice speaks unless told otherwise.
  const lang = isEnglish(language) ? undefined : language
  const voiceForLanguage = useVoiceAvailable(lang)
  const canSay = lang ? voiceForLanguage : isSpeechSupported()
  const speaking = status === 'playing'

  useEffect(() => {
    // Read here, not followed: muting and unmuting are taps, and deal with the voice themselves.
    if (!canSay || useTutorSoundStore.getState().muted || !soundMayStart()) return
    void play(line, 1, lang)
    return stop
  }, [canSay, line, lang, play, stop])

  return {
    /** The device can say this line; otherwise there is nothing to play or to mute. */
    canSay,
    speaking,
    muted,
    /** Say the line (again), or stop it. From a tap. */
    replay: () => {
      if (speaking) stop()
      else void play(line, 1, lang)
    },
    /** Silence the tutor for good, or let it speak again, starting now. From a tap. */
    toggleMuted: () => {
      if (muted) {
        setMuted(false)
        void play(line, 1, lang)
      } else {
        stop()
        setMuted(true)
      }
    },
  }
}
