/**
 * Spoken English from the device's own text-to-speech (the Web Speech API). It needs no audio
 * files and no server, but the voice differs from device to device and some have none.
 * TODO(content): recorded audio per prompt, so every learner hears the same voice.
 */

export class SpeechError extends Error {
  readonly reason: 'unsupported' | 'failed'

  constructor(reason: 'unsupported' | 'failed') {
    super(`Speech ${reason}`)
    this.name = 'SpeechError'
    this.reason = reason
  }
}

export type SpeakOptions = {
  /** 1 is normal speed; lower is slower. */
  rate?: number
}

/** How a spoken text finished: played to the end, or stopped by `cancelSpeech`. */
export type SpeechOutcome = 'ended' | 'cancelled'

/** If nothing starts within this time the device has no usable voice. */
const START_TIMEOUT_MS = 4000

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

/**
 * Ask the browser for its voices ahead of time. Chrome loads them asynchronously, and `speak`
 * cannot wait for them: on iOS speech must start inside the tap that asked for it.
 */
export function primeVoices(): void {
  if (isSpeechSupported()) window.speechSynthesis.getVoices()
}

const languageRank = (lang: string) => {
  const tag = lang.toLowerCase().replace('_', '-')
  // Indian English first: it is what learners hear around them.
  if (tag === 'en-in') return 0
  if (tag === 'en-gb') return 1
  if (tag === 'en-us') return 2
  return 3
}

/** The best English voice on offer; on-device voices win, as they also work offline. */
export function pickEnglishVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  return voices
    .filter((voice) => voice.lang.toLowerCase().startsWith('en'))
    .sort(
      (a, b) =>
        Number(b.localService) - Number(a.localService) ||
        languageRank(a.lang) - languageRank(b.lang),
    )[0]
}

// Chrome can garbage-collect an utterance that is still speaking, which loses its `end` event.
let current: SpeechSynthesisUtterance | null = null

/** Say a text aloud. Call it from a tap. Rejects with `SpeechError` when it cannot be played. */
export function speak(text: string, { rate = 1 }: SpeakOptions = {}): Promise<SpeechOutcome> {
  if (!isSpeechSupported()) return Promise.reject(new SpeechError('unsupported'))

  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = pickEnglishVoice(synth.getVoices())
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'en-US'
    utterance.rate = rate
    current = utterance

    const finish = (settle: () => void) => {
      clearTimeout(startTimer)
      if (current === utterance) current = null
      settle()
    }
    const startTimer = setTimeout(() => {
      synth.cancel()
      finish(() => reject(new SpeechError('failed')))
    }, START_TIMEOUT_MS)

    utterance.onstart = () => clearTimeout(startTimer)
    utterance.onend = () => finish(() => resolve('ended'))
    utterance.onerror = (event) =>
      finish(() =>
        event.error === 'canceled' || event.error === 'interrupted'
          ? resolve('cancelled')
          : reject(new SpeechError('failed')),
      )

    synth.speak(utterance)
  })
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
