import { useHaptics } from '@/shared/hooks/useHaptics'
import { useVoiceRecording, type VoiceRecordingOptions } from '@/shared/lib/audio/useVoiceRecording'

/**
 * A learner saying something into the microphone on a lesson day, for `PronunciationPractice`:
 * the recording itself and the handlers for its button.
 */
export function useSpokenPractice(stopPlayback: () => void, options?: VoiceRecordingOptions) {
  const haptic = useHaptics()
  const recording = useVoiceRecording(options)

  const startSpeaking = () => {
    // The device's voice must not be recorded as the learner's own.
    stopPlayback()
    haptic('recordStart')
    void recording.start()
  }
  const stopSpeaking = () => {
    haptic('recordStop')
    recording.stop()
  }
  /** The microphone shuts with nothing made of what it picked up. */
  const cancelSpeaking = () => {
    haptic('recordStop')
    recording.cancel()
  }

  return { recording, startSpeaking, stopSpeaking, cancelSpeaking }
}
