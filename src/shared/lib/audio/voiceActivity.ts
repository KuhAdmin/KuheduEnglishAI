/**
 * Whether someone is speaking into the microphone, judged by loudness alone: sound clearly
 * above the room's own level. Nothing is recognised, so a cough or a passing bus can count as a
 * voice and a whisper may not. It is good enough to notice that a learner has begun or has
 * stopped, and nothing that must be right may depend on it.
 */

/** What has been heard since listening began. */
export type VoiceReading = {
  /** A voice has been heard at least once. */
  heard: boolean
  /** When it was last heard, on the clock of `performance.now()`. */
  lastVoiceAt: number | null
}

/** Quieter than this is never a voice, however quiet the room (loudness from 0 to 1). */
const MIN_VOICE_LEVEL = 0.02
/** A voice is this many times louder than the room. */
const VOICE_OVER_ROOM = 2.5
/** Loud for less than this is a click or a knock, not a voice. */
const VOICE_HOLD_MS = 150
/** How fast the room's level is followed: at once when it falls, slowly when it rises. */
const ROOM_FALL = 0.5
const ROOM_RISE = 0.05
/** The first moments only measure the room: a microphone that has just opened reads silence. */
const SETTLE_MS = 300
const SAMPLE_MS = 50

/**
 * Follows a run of loudness readings. The room's level is learned from the quiet stretches
 * only, so a long sentence is not taken for a noisy room.
 */
export function createVoiceDetector(): (level: number, now: number) => VoiceReading {
  let began: number | null = null
  let room = 0
  let loudSince: number | null = null
  let heard = false
  let lastVoiceAt: number | null = null

  return (level, now) => {
    began ??= now
    if (now - began < SETTLE_MS) {
      room += (level - room) * ROOM_FALL
    } else if (level >= Math.max(MIN_VOICE_LEVEL, room * VOICE_OVER_ROOM)) {
      loudSince ??= now
      if (now - loudSince >= VOICE_HOLD_MS) {
        heard = true
        lastVoiceAt = now
      }
    } else {
      loudSince = null
      room += (level - room) * (level < room ? ROOM_FALL : ROOM_RISE)
    }
    return { heard, lastVoiceAt }
  }
}

/** Loudness of a stretch of sound, from 0 (silence) to 1. */
export function loudness(samples: Float32Array): number {
  let sum = 0
  for (const sample of samples) sum += sample * sample
  return samples.length > 0 ? Math.sqrt(sum / samples.length) : 0
}

// One for the page: browsers allow only a few, and it must be started inside a tap.
let context: AudioContext | null = null

/**
 * Get ready to listen. Call it from a tap: iOS only lets sound processing start inside one.
 * Without it (or on a device that has none) `listenForVoice` gives `null`.
 */
export function prepareListening(): void {
  if (typeof window === 'undefined') return
  const Context =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Context) return
  try {
    context ??= new Context()
    if (context.state !== 'running') void context.resume().catch(() => {})
  } catch {
    context = null
  }
}

/** Stop processing sound until the next `prepareListening`, e.g. when the conversation is left. */
export function restListening(): void {
  if (context?.state === 'running') void context.suspend().catch(() => {})
}

/** Whether a microphone opened now could be listened to. */
export function canListenForVoice(): boolean {
  return context?.state === 'running'
}

/**
 * Listen to a microphone that is already open and report what is heard, several times a
 * second. Returns how to stop, or `null` when this device cannot measure sound; the caller
 * still owns the stream.
 */
export function listenForVoice(
  stream: MediaStream,
  onReading: (reading: VoiceReading) => void,
): (() => void) | null {
  if (!context || context.state !== 'running') return null
  try {
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)

    const samples = new Float32Array(analyser.fftSize)
    const detect = createVoiceDetector()
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples)
      onReading(detect(loudness(samples), performance.now()))
    }, SAMPLE_MS)

    return () => {
      clearInterval(timer)
      source.disconnect()
    }
  } catch {
    return null
  }
}
