/**
 * Everything the app says aloud. A text is said in one of the server's voices: the sound is made
 * there (once, then kept) and played here, so every learner hears the same voice on every
 * device. The device's own text-to-speech is not used at all: where the server has no voice for
 * a language, or cannot be reached and the sound was never heard before, the text is only shown.
 */

import { SPEECH_MOUTH_HEADER, speechMouthSchema } from '@kuhedu/contracts'
import { tutorVoiceKind } from '@/shared/lib/learner/tutorAvatar'
import { env } from '../env'
import type { MouthMark } from './lipSync'
import {
  loadSpeechVoices,
  onSpeechVoicesChanged,
  speechVoices,
  speechVoicesKnown,
} from './speechCatalogue'
import { chosenVoices } from './useVoiceStore'
import {
  voiceForFace,
  voiceForSpeaker,
  voicesFor,
  type VoiceChoice,
  type VoiceKind,
} from './voices'

export class SpeechError extends Error {
  /** `unsupported`: there is no voice for it. `failed`: there is, and it could not be played. */
  readonly reason: 'unsupported' | 'failed'

  constructor(reason: 'unsupported' | 'failed') {
    super(`Speech ${reason}`)
    this.name = 'SpeechError'
    this.reason = reason
  }
}

export type SpeakOptions = {
  /** 1 is normal speed; lower is slower. The same sound is played slower, at its own pitch. */
  rate?: number
  /** The language of the text when it is not English, as a language tag (`hi`, `hi-IN`). */
  lang?: string
  /** Say it with this voice, whatever the learner chose: for trying a voice out before choosing it. */
  voiceId?: string
}

/** One of several texts said in a row. */
export type SpeechPart = {
  text: string
  /**
   * Who says it, counted from 0, when several people speak (a conversation). The first has the
   * voice of the learner's tutor, the second the other tutor's. Left out: the learner's tutor.
   */
  speaker?: number
  /**
   * Said by a woman or a man of the content's own (a person in a conversation): the default
   * voice of that kind, whoever the learner's tutor is and whatever voices they chose, so that
   * "Asha" is never given a man's voice. It decides before `speaker` does.
   */
  voice?: VoiceKind
}

export type SpeakAllOptions = SpeakOptions & {
  /** Called as each part begins, with its position in the list. */
  onPartStart?: (index: number) => void
}

/** How a spoken text finished: played to the end, or stopped by `cancelSpeech`. */
export type SpeechOutcome = 'ended' | 'cancelled'

const canPlaySound = () => typeof window !== 'undefined' && typeof Audio !== 'undefined'

/**
 * Whether the app can say anything. True until the server has said that it offers no voices:
 * while its answer is on the way nothing is called impossible.
 */
export function isSpeechSupported(): boolean {
  return canPlaySound() && (speechVoices().length > 0 || !speechVoicesKnown())
}

/** Ask the server for its voices ahead of time, so that the first tap does not wait for them. */
export function primeVoices(): void {
  if (canPlaySound()) void loadSpeechVoices()
}

/**
 * Whether there is a voice for this language. Only what is known counts: a language is not
 * offered to be heard until the server has said it has a voice for it.
 */
export function hasVoiceFor(language: string): boolean {
  return canPlaySound() && voicesFor(speechVoices(), language).length > 0
}

/** Be told when the server's voices have arrived or changed. Returns how to stop listening. */
export const onVoicesChanged = onSpeechVoicesChanged

/** A sound while it is being played: what a face needs to move its lips with it. */
export type PlayingSound = {
  /** The lips through it, as the server sent them; `null` for a sound that came without. */
  mouth: readonly MouthMark[] | null
  /**
   * How far into it the player is, in seconds of the sound itself: played slowly, it takes
   * longer to get there, and the lips with it.
   */
  position: () => number
  /** Its length in seconds; not a number until the player knows it. */
  duration: () => number
}

/**
 * What the voice is doing, for anything that moves with it (a talking face): each part as its
 * sound starts, with the sound to follow, and the end.
 */
export type SpeechActivity = { type: 'start'; text: string; sound: PlayingSound } | { type: 'end' }

const activityListeners = new Set<(activity: SpeechActivity) => void>()
/** The part being said right now, for a listener that starts listening while it is. */
let underWay: SpeechActivity | null = null
const tell = (activity: SpeechActivity) => {
  underWay = activity.type === 'start' ? activity : null
  for (const listener of activityListeners) listener(activity)
}

/**
 * Be told as texts are said aloud, whoever asked for them. Returns how to stop listening. A
 * listener that joins while something is being said is told of it at once: a face drawn only as
 * its line begins (a partner's, in a conversation) must not miss the sound it is there for.
 */
export function onSpeechActivity(listener: (activity: SpeechActivity) => void): () => void {
  activityListeners.add(listener)
  if (underWay) listener(underWay)
  return () => activityListeners.delete(listener)
}

/**
 * The voice a text is said with: the one asked for, else the voice of the learner's tutor for
 * that language (Profile › Voice settings has one for the male tutor and one for the female,
 * Profile › Tutor avatar says which tutor is theirs). A voice the server no longer offers is
 * passed over, so a choice made on another day cannot leave the app silent. A part that says
 * whether a woman or a man speaks it gets the default voice of that kind instead.
 */
function voiceToUse(
  language: string,
  voiceId: string | undefined,
  { speaker = 0, voice: kind }: SpeechPart,
): VoiceChoice | undefined {
  const voices = speechVoices()
  const asked = voiceId && voicesFor(voices, language).find((voice) => voice.id === voiceId)
  if (asked) return asked
  if (kind) return voiceForFace(voices, language, kind)
  return voiceForSpeaker(voices, language, tutorVoiceKind(), chosenVoices(language), speaker)
}

/**
 * Where the sound of a text in a voice is. The address is the sound's name: it never changes,
 * and a browser keeps what it got there for good. So the address also names what comes with the
 * sound (`with`): a copy kept from before the mouth was sent with it is not this sound.
 */
export const soundUrl = (text: string, voiceId: string) =>
  `${env.VITE_API_BASE_URL}/speech/audio?${new URLSearchParams({ voice: voiceId, text, with: 'lips' })}`

/** A sound as the player is given it, and the mouth that came with it. */
type KeptSound = { address: string; mouth: MouthMark[] | null }

// Sounds fetched in this session, each as the address the player is given for it, so that
// hearing a line again, or slowly, asks for nothing. The browser and the service worker keep
// them for longer; this is only the nearest shelf.
const MAX_KEPT = 80
const kept = new Map<string, Promise<KeptSound>>()

const forget = (url: string) => {
  // An address is let go only when its sound leaves the shelf: never while the player may
  // still be holding it.
  void kept.get(url)?.then(
    ({ address }) => URL.revokeObjectURL(address),
    () => {},
  )
  kept.delete(url)
}

/** The sound of a text in a voice, fetched once, as an address the player can play. */
function fetchSound(text: string, voiceId: string): Promise<KeptSound> {
  const url = soundUrl(text, voiceId)
  const known = kept.get(url)
  if (known) return known

  const sound = fetch(url).then(async (response) => {
    if (!response.ok) throw new Error(`No sound (${response.status})`)
    // What the server says is checked like anything else it sends; a mouth that does not read
    // as one is left out, and the sound is played all the same.
    const mouth = speechMouthSchema.safeParse(response.headers.get(SPEECH_MOUTH_HEADER))
    return {
      address: URL.createObjectURL(await response.blob()),
      mouth: mouth.success ? mouth.data : null,
    }
  })
  kept.set(url, sound)
  // A sound that could not be fetched is asked for again next time.
  sound.catch(() => kept.delete(url))
  if (kept.size > MAX_KEPT) {
    const oldest = kept.keys().next().value
    if (oldest !== undefined) forget(oldest)
  }
  return sound
}

// One player for everything: a phone lets a sound start by itself only on a player the learner
// has already started once with a tap (iOS), so the same one is kept and reused.
let player: HTMLAudioElement | null = null
function soundPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    player.preload = 'auto'
  }
  return player
}

// The shortest silent sound there is: played inside the learner's first tap, it is what lets
// later sounds start after their fetch, when the tap itself is over.
const SILENCE =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
// What a phone counts as the learner's own doing; the press that comes before a tap is not.
const TAPS = ['click', 'touchend', 'keydown'] as const
let unlocked = false

function unlockOnTap() {
  // Nothing to unlock for an app that has nothing to say; and a tap that already started a
  // sound has done the unlocking itself.
  if (unlocked || speechVoices().length === 0 || current) return
  const audio = soundPlayer()
  audio.src = SILENCE
  // `play` gives no promise in a test's pretend browser.
  void Promise.resolve(audio.play())
    .then(() => {
      unlocked = true
      for (const tap of TAPS) window.removeEventListener(tap, unlockOnTap, true)
    })
    .catch(() => {})
}
// Before the screen's own handlers hear of the tap: one of them may be about to speak.
if (canPlaySound()) for (const tap of TAPS) window.addEventListener(tap, unlockOnTap, true)

// What is being said now. `stop` settles its promise as cancelled.
let current: { stop: () => void } | null = null

/**
 * Say several texts aloud, one after another. While one is being said the ones after it are
 * fetched, so that a later line is ready when its turn comes. Rejects with `SpeechError` when
 * it cannot be played.
 */
export function speakAll(
  parts: readonly SpeechPart[],
  { rate = 1, lang, voiceId, onPartStart }: SpeakAllOptions = {},
): Promise<SpeechOutcome> {
  if (!canPlaySound()) return Promise.reject(new SpeechError('unsupported'))
  if (parts.length === 0) return Promise.resolve('ended')

  current?.stop()

  return new Promise((resolve, reject) => {
    const audio = soundPlayer()
    let settled = false
    let handed = false

    const finish = (settle: () => void) => {
      if (settled) return
      settled = true
      audio.onended = null
      audio.onerror = null
      // Only a sound that was handed to the player is there to be stopped.
      if (handed) audio.pause()
      if (current === me) current = null
      tell({ type: 'end' })
      settle()
    }
    const fail = (reason: 'unsupported' | 'failed') => finish(() => reject(new SpeechError(reason)))
    const me = { stop: () => finish(() => resolve('cancelled')) }
    current = me

    const play = async (sounds: readonly Promise<KeptSound>[], index: number) => {
      const part = parts[index]
      const sound = sounds[index]
      if (!part || !sound) return finish(() => resolve('ended'))
      try {
        const { address, mouth } = await sound
        if (settled) return
        audio.src = address
        handed = true
        // Set after the source, which puts the speed back to the player's own.
        audio.defaultPlaybackRate = rate
        audio.playbackRate = rate
        audio.preservesPitch = true
        // The player is shared, so what it reports is only taken as this sound's while this
        // sound is the one it holds.
        const mine = () => !settled && audio.src === address
        audio.onended = () => {
          if (mine()) void play(sounds, index + 1)
        }
        audio.onerror = () => {
          if (mine()) fail('failed')
        }
        await audio.play()
        if (settled) return
        unlocked = true
        onPartStart?.(index)
        tell({
          type: 'start',
          text: part.text,
          sound: {
            mouth,
            position: () => (mine() ? audio.currentTime : 0),
            duration: () => audio.duration,
          },
        })
      } catch {
        // Stopped by `cancelSpeech`, the wait simply ends; anything else could not be played.
        fail('failed')
      }
    }

    const begin = () => {
      if (settled) return
      const language = lang ?? 'en'
      const voices = parts.map((part) => voiceToUse(language, voiceId, part))
      if (voices.some((voice) => voice === undefined)) return fail('unsupported')

      // Asked for one after another, in the order they will be heard, each as soon as the one
      // before it has arrived. The server makes one sound at a time: asked for all at once, the
      // first line of a conversation could be kept waiting behind its last.
      const sounds: Promise<KeptSound>[] = []
      let next: Promise<unknown> = Promise.resolve()
      parts.forEach((part, index) => {
        const sound = next.then(() => {
          if (settled) throw new Error('No longer wanted')
          return fetchSound(part.text, voices[index]?.id ?? '')
        })
        // A later line that cannot be fetched fails when its turn comes, not before; and the
        // lines after it are still asked for.
        next = sound.catch(() => {})
        sounds.push(sound)
      })
      void play(sounds, 0)
    }

    // On a first visit the voices may still be on their way: wait for them, once.
    if (speechVoicesKnown()) begin()
    else void loadSpeechVoices().then(begin)
  })
}

/** Say a text aloud. Rejects with `SpeechError` when it cannot be played. */
export function speak(text: string, options: SpeakOptions = {}): Promise<SpeechOutcome> {
  return speakAll([{ text }], options)
}

export function cancelSpeech(): void {
  current?.stop()
}

/** For tests: forget the sounds fetched and whatever is playing. */
export function resetSpeech(): void {
  current?.stop()
  for (const url of [...kept.keys()]) forget(url)
  unlocked = false
  player = null
}
