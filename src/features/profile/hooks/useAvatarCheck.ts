import { useEffect, useRef, useState } from 'react'
import { useLipSync } from '@/shared/lib/audio/useLipSync'
import { useSpeechPlayback } from '@/shared/lib/audio/useSpeechPlayback'
import { useVoices } from '@/shared/lib/audio/useVoices'
import { useVoiceStore } from '@/shared/lib/audio/useVoiceStore'
import { voiceForFace } from '@/shared/lib/audio/voices'
import { DEFAULT_LANGUAGE, useTFor } from '@/shared/lib/i18n'
import { tutorAvatars, useTutorAvatar } from '@/shared/lib/learner/tutorAvatar'
import type { AvatarMood } from '@/shared/ui/AvatarFrame'

/** How long the thumbs up stays after the sample has been said. */
const CHEER_MS = 2500

/**
 * Trying the tutor's face out: it says a sample sentence with its lips moving, then gives a
 * thumbs up for a moment, and smiles the rest of the time. The sample is said in that tutor's
 * voice (`voiceForFace`): the one chosen for its kind in Voice settings, else the device's first
 * voice of that kind.
 */
export function useAvatarCheck() {
  const mouth = useLipSync()
  const playback = useSpeechPlayback()
  // What the tutor says is English, whatever language the screen is in.
  const sample = useTFor(DEFAULT_LANGUAGE)('voice.sample')
  const avatar = useTutorAvatar()
  const deviceVoices = useVoices()
  const chosenVoices = useVoiceStore((state) => state.voices[DEFAULT_LANGUAGE])
  const face = tutorAvatars.find(({ id }) => id === avatar)
  const voice =
    face && voiceForFace(deviceVoices, DEFAULT_LANGUAGE, face.voice, chosenVoices?.[face.voice])
  const [cheering, setCheering] = useState(false)
  const cheerTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(cheerTimer.current), [])

  const speaking = playback.status === 'playing'
  const mood: AvatarMood = speaking ? 'neutral' : cheering ? 'encourage' : 'smile'

  const toggle = () => {
    clearTimeout(cheerTimer.current)
    setCheering(false)
    if (speaking) {
      playback.stop()
      return
    }
    void playback
      .playAll([{ text: sample }], voice ? { voiceURI: voice.id } : {})
      .then((outcome) => {
        // A device that cannot speak still shows what the face does; a sample cut short does not.
        if (outcome === 'cancelled') return
        setCheering(true)
        cheerTimer.current = setTimeout(() => setCheering(false), CHEER_MS)
      })
  }

  return { mouth, mood, speaking, failed: playback.status === 'failed', sample, voice, toggle }
}
