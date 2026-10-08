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

/** One of several texts said in a row. */
export type SpeechPart = {
  text: string
  /** 1 is the voice's own pitch; a different one tells two speakers apart. */
  pitch?: number
}

export type SpeakAllOptions = SpeakOptions & {
  /** Called as each part begins, with its position in the list. */
  onPartStart?: (index: number) => void
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

// What is being said now. Chrome can garbage-collect an utterance that is still speaking, which
// loses its `end` event, so the utterances are kept here; `stop` settles the promise as
// cancelled, because browsers disagree on which event (if any) a cancelled utterance fires.
let current: { utterances: SpeechSynthesisUtterance[]; stop: () => void } | null = null

/**
 * Say several texts aloud, one after another. Call it from a tap: every text is handed to the
 * device at once, because iOS only lets speech start inside the tap that asked for it.
 * Rejects with `SpeechError` when it cannot be played.
 */
export function speakAll(
  parts: readonly SpeechPart[],
  { rate = 1, onPartStart }: SpeakAllOptions = {},
): Promise<SpeechOutcome> {
  if (!isSpeechSupported()) return Promise.reject(new SpeechError('unsupported'))
  if (parts.length === 0) return Promise.resolve('ended')

  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis
    current?.stop()
    synth.cancel()

    const voice = pickEnglishVoice(synth.getVoices())
    const utterances = parts.map(({ text, pitch = 1 }) => {
      const utterance = new SpeechSynthesisUtterance(text)
      if (voice) utterance.voice = voice
      utterance.lang = voice?.lang ?? 'en-US'
      utterance.rate = rate
      utterance.pitch = pitch
      return utterance
    })

    let settled = false
    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(startTimer)
      if (current?.utterances === utterances) current = null
      settle()
    }
    const startTimer = setTimeout(() => {
      synth.cancel()
      finish(() => reject(new SpeechError('failed')))
    }, START_TIMEOUT_MS)

    current = { utterances, stop: () => finish(() => resolve('cancelled')) }

    utterances.forEach((utterance, index) => {
      utterance.onstart = () => {
        clearTimeout(startTimer)
        if (!settled) onPartStart?.(index)
      }
      utterance.onend = () => {
        if (index === utterances.length - 1) finish(() => resolve('ended'))
      }
      utterance.onerror = (event) =>
        finish(() =>
          event.error === 'canceled' || event.error === 'interrupted'
            ? resolve('cancelled')
            : reject(new SpeechError('failed')),
        )
      synth.speak(utterance)
    })
  })
}

/** Say a text aloud. Call it from a tap. Rejects with `SpeechError` when it cannot be played. */
export function speak(text: string, options: SpeakOptions = {}): Promise<SpeechOutcome> {
  return speakAll([{ text }], options)
}

export function cancelSpeech(): void {
  current?.stop()
  if (isSpeechSupported()) window.speechSynthesis.cancel()
}
