import { speechVoicesSchema, type SpeechVoice } from '@kuhedu/contracts'
import { apiRequest } from '../api/client'

/**
 * The voices the server can speak with, as the app last heard of them. The list is asked for
 * once a session and its last answer is kept in this browser, so that a learner who is offline
 * can still hear what the app has kept of earlier sessions.
 */

const STORAGE_KEY = 'kuhedu-speech-voices'
const NONE: readonly SpeechVoice[] = []
/** After the server failed to answer, how long before it is asked again. */
const RETRY_MS = 30_000

function readSaved(): readonly SpeechVoice[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    // Anything in browser storage may have been put there by anyone: checked like an answer.
    const parsed = speechVoicesSchema.safeParse(saved)
    return parsed.success && parsed.data.voices.length > 0 ? parsed.data.voices : NONE
  } catch {
    return NONE
  }
}

let voices: readonly SpeechVoice[] = typeof localStorage === 'undefined' ? NONE : readSaved()
/** The server has answered in this session, with voices or with none. */
let answered = false
let loading: Promise<void> | null = null
let failedAt = 0
const listeners = new Set<() => void>()

/** The voices on offer. The same list object until the voices themselves change. */
export const speechVoices = (): readonly SpeechVoice[] => voices

/**
 * Whether it is known what the server offers: it has answered, or an earlier answer is kept.
 * Until then nothing is called unavailable: the answer is on its way.
 */
export const speechVoicesKnown = (): boolean => answered || voices.length > 0

/** Be told when the list of voices arrives or changes. Returns how to stop listening. */
export function onSpeechVoicesChanged(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function keep(next: readonly SpeechVoice[]) {
  // A server that cannot speak right now answers with no voices. What was known is kept: the
  // sounds already made are still served, and still play.
  if (next.length > 0 && JSON.stringify(next) !== JSON.stringify(voices)) {
    voices = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ voices: next }))
    } catch {
      // Storage that is full or switched off only costs the offline copy.
    }
  }
  for (const listener of listeners) listener()
}

/**
 * Ask the server for its voices, once: later calls wait for the same answer. An answer that
 * did not come is asked for again, but not more often than every half minute.
 */
export function loadSpeechVoices(): Promise<void> {
  if (answered) return Promise.resolve()
  if (loading) return loading
  if (failedAt !== 0 && Date.now() - failedAt < RETRY_MS) return Promise.resolve()

  loading = apiRequest('/speech/voices', { schema: speechVoicesSchema })
    .then((answer) => {
      answered = true
      keep(answer.voices)
    })
    .catch(() => {
      failedAt = Date.now()
      // Whoever was waiting to know whether there is a voice now knows there is none for now.
      for (const listener of listeners) listener()
    })
    .finally(() => {
      loading = null
    })
  return loading
}

/** For tests: forget everything, as a browser that has never opened the app. */
export function resetSpeechVoices(next: readonly SpeechVoice[] = NONE, known = next.length > 0) {
  voices = next
  answered = known
  loading = null
  failedAt = 0
  for (const listener of listeners) listener()
}
