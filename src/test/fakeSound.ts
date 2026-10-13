import { SPEECH_MOUTH_HEADER, type SpeechVoice } from '@kuhedu/contracts'
import { vi } from 'vitest'
import { resetSpeech } from '@/shared/lib/audio/speech'
import { resetSpeechVoices } from '@/shared/lib/audio/speechCatalogue'

/**
 * A server that speaks, and a device that plays, for tests: jsdom has neither. What the app
 * asks to hear is recorded, so a test can say which text was said in which voice, at what speed.
 */

/**
 * A voice as the server lists it. Its name is read off its id, and so is its gender unless
 * given: a Bengali voice's id does not say it.
 */
export const testVoice = (
  id: string,
  language: string,
  isDefault = false,
  gender: SpeechVoice['gender'] = id.charAt(1) === 'f' ? 'female' : 'male',
): SpeechVoice => {
  const name = id.split('_')[1] ?? id
  return {
    id,
    name: `${name.charAt(0).toUpperCase()}${name.slice(1)}`,
    language,
    gender,
    default: isDefault,
  }
}

/**
 * A small version of what the server offers: two accents of English, Hindi, and Bengali, which
 * is said by Hindi's speakers under ids of its own. Nothing for any other language.
 */
export const TEST_VOICES: readonly SpeechVoice[] = [
  testVoice('af_heart', 'en-US', true),
  testVoice('af_bella', 'en-US'),
  testVoice('am_michael', 'en-US', true),
  testVoice('am_fenrir', 'en-US'),
  testVoice('bf_emma', 'en-GB'),
  testVoice('bm_george', 'en-GB'),
  testVoice('hf_alpha', 'hi-IN', true),
  testVoice('hm_omega', 'hi-IN', true),
  testVoice('bn_alpha', 'bn-IN', true, 'female'),
  testVoice('bn_omega', 'bn-IN', true, 'male'),
]

export type Played = { text: string; voice: string; rate: number }

type Sound = { text: string; voice: string }

export type FakeSound = {
  /** Every sound that started playing, in order. */
  played: Played[]
  /** Every sound asked of the server, in order: one that is kept is not asked for again. */
  fetched: Sound[]
  /** The sound that is playing reaches its end. */
  endSound: () => void
  /** The player gives up on the sound it has. */
  breakSound: () => void
  /** Whether the player was told to stop. */
  paused: () => boolean
  /** From now on the server answers, or does not. */
  serverUp: (up: boolean) => void
  /** The player learns how long the sound it has is, in seconds. Until then it does not know. */
  lasts: (seconds: number) => void
}

/**
 * Put the fakes in place, with the server's voices already known to the app (as on any visit
 * but the first). Give `known: false` for the first visit, before the list has arrived, and
 * `mouth` for a server that sends that mouth with every sound (`0c75m150o`).
 *
 * The player keeps time by the clock, so a test with fake timers moves through a sound by
 * advancing them.
 */
export function installFakeSound(
  voices: readonly SpeechVoice[] = TEST_VOICES,
  { known = true, mouth }: { known?: boolean; mouth?: string } = {},
): FakeSound {
  const played: Played[] = []
  const fetched: Sound[] = []
  const sounds = new WeakMap<Blob, Sound>()
  const urls = new Map<string, Sound>()
  let up = true
  let count = 0
  let latest: FakeAudio | undefined

  class FakeAudio {
    preload = ''
    playbackRate = 1
    defaultPlaybackRate = 1
    preservesPitch = true
    paused = true
    duration = Number.NaN
    onended: (() => void) | null = null
    onerror: (() => void) | null = null
    private address = ''
    private reached = 0
    private since = 0

    constructor() {
      // The newest player is the one in use: the app keeps one.
      latest = this as FakeAudio
    }

    get src() {
      return this.address
    }

    // A new sound starts from its beginning, and its length is not known yet.
    set src(address: string) {
      this.address = address
      this.reached = 0
      this.duration = Number.NaN
    }

    /** Seconds of the sound itself: played slowly, fewer of them go by. */
    get currentTime() {
      if (this.paused) return this.reached
      return this.reached + ((Date.now() - this.since) / 1000) * this.playbackRate
    }

    play() {
      const sound = urls.get(this.src)
      // The silent sound that unlocks a phone's player is not something that was said.
      if (sound) played.push({ ...sound, rate: this.playbackRate })
      this.since = Date.now()
      this.paused = false
      return Promise.resolve()
    }

    pause() {
      this.reached = this.currentTime
      this.paused = true
    }
  }

  vi.stubGlobal('Audio', FakeAudio)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (!up) throw new TypeError('Failed to fetch')
      if (url.pathname.endsWith('/speech/voices')) return Response.json({ voices })
      if (url.pathname.endsWith('/speech/audio')) {
        const sound = {
          text: url.searchParams.get('text') ?? '',
          voice: url.searchParams.get('voice') ?? '',
        }
        fetched.push(sound)
        const blob = new Blob(['sound'], { type: 'audio/mpeg' })
        sounds.set(blob, sound)
        const headers = new Headers(mouth ? { [SPEECH_MOUTH_HEADER]: mouth } : undefined)
        // Handed back as it is: a real `Response` would give out a copy, which nothing knows.
        return { ok: true, status: 200, headers, blob: async () => blob } as Response
      }
      return new Response(null, { status: 404 })
    }),
  )
  Object.assign(URL, {
    createObjectURL: (blob: Blob) => {
      const url = `blob:sound-${++count}`
      const sound = sounds.get(blob)
      if (sound) urls.set(url, sound)
      return url
    },
    revokeObjectURL: () => {},
  })

  resetSpeech()
  resetSpeechVoices(known ? voices : [], known)

  return {
    played,
    fetched,
    endSound: () => latest?.onended?.(),
    breakSound: () => latest?.onerror?.(),
    paused: () => latest?.paused ?? true,
    serverUp: (next) => {
      up = next
    },
    lasts: (seconds) => {
      if (latest) latest.duration = seconds
    },
  }
}

/** Take the fakes away again, and with them everything the app knew about voices. */
export function removeFakeSound() {
  resetSpeech()
  resetSpeechVoices()
  vi.unstubAllGlobals()
}
