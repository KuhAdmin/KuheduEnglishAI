import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  apiErrorSchema,
  SPEECH_MOUTH_HEADER,
  speechMouthSchema,
  speechVoicesSchema,
  type SpeechVoice,
} from '@kuhedu/contracts'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildApp, type App } from '../src/app.ts'
import { createSoundCache } from '../src/modules/speech/soundCache.ts'
import type { Speaker } from '../src/modules/speech/speaker.ts'

const heart: SpeechVoice = {
  id: 'af_heart',
  name: 'Heart',
  language: 'en-US',
  gender: 'female',
  default: true,
}
const alpha: SpeechVoice = {
  id: 'hf_alpha',
  name: 'Alpha',
  language: 'hi-IN',
  gender: 'female',
  default: true,
}
// Bengali is said by another model than the rest, and its id does not say what the voice is.
const diya: SpeechVoice = {
  id: 'bn_diya',
  name: 'Diya',
  language: 'bn-IN',
  gender: 'female',
  default: true,
}

/** A speaking service that says nothing, counts what it was asked, and can be switched off. */
function fakeSpeaker(model = 'kokoro-test', bengaliModel = 'indic-test') {
  const state = {
    up: true,
    said: [] as { text: string; voice: string }[],
    model,
    /** The mouth that comes with every sound; `null` for a service that cannot say. */
    mouth: '0c75m150o' as string | null,
  }
  const speaker: Speaker = {
    catalogue: async () => {
      if (!state.up) throw new Error('connect ECONNREFUSED 127.0.0.1:8788')
      // Only the voice another model says names its model; the rest are the service's own.
      return { model: state.model, voices: [heart, alpha, { ...diya, model: bengaliModel }] }
    },
    speak: async (text, voice) => {
      if (!state.up) throw new Error('connect ECONNREFUSED 127.0.0.1:8788')
      state.said.push({ text, voice })
      return { sound: Buffer.from(`sound of ${voice}: ${text}`), mouth: state.mouth }
    },
  }
  return { speaker, state }
}

let app: App | undefined
let folder: string

function start(speaker: Speaker, requestsPerMinute?: number) {
  app = buildApp({
    checkDatabase: async () => true,
    speech: { speaker, cache: createSoundCache(folder), requestsPerMinute },
  })
  return app
}

const audio = (text: string, voice = 'af_heart') =>
  `/api/speech/audio?voice=${voice}&text=${encodeURIComponent(text)}`

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'kuhedu-speech-'))
})

afterEach(async () => {
  await app?.close()
  app = undefined
  await rm(folder, { recursive: true, force: true })
})

describe('GET /api/speech/voices', () => {
  it('lists the voices the speaking service offers', async () => {
    const response = await start(fakeSpeaker().speaker).inject('/api/speech/voices')

    expect(response.statusCode).toBe(200)
    expect(speechVoicesSchema.parse(response.json()).voices).toEqual([heart, alpha, diya])
    // Which model says a voice is the shelf's business: the app is told the voice and no more.
    expect(response.json().voices).toEqual([heart, alpha, diya])
  })

  it('answers with no voices, not with a failure, while the service is down', async () => {
    const { speaker, state } = fakeSpeaker()
    state.up = false

    const response = await start(speaker).inject('/api/speech/voices')

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ voices: [] })
  })

  it('does not exist on a server that was given nothing to speak with', async () => {
    app = buildApp({ checkDatabase: async () => true })
    expect((await app.inject('/api/speech/voices')).statusCode).toBe(404)
  })
})

describe('the mouth that comes with a sound', () => {
  it('is read into marks: a shape, and the second it is taken from', () => {
    expect(speechMouthSchema.parse('0c75m1500o')).toEqual([
      { at: 0, shape: 'closed' },
      { at: 0.075, shape: 'mid' },
      { at: 1.5, shape: 'open' },
    ])
  })

  it.each(['', 'c', '75', '0c75x', '0c 75m', '-5c'])('is not read from %j', (text) => {
    expect(speechMouthSchema.safeParse(text).success).toBe(false)
  })
})

describe('GET /api/speech/audio', () => {
  it('answers with the sound, to be kept for good by whatever is in between', async () => {
    const { speaker, state } = fakeSpeaker()
    const response = await start(speaker).inject(audio('Hello! Good morning.'))

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toBe('audio/mpeg')
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(response.body).toBe('sound of af_heart: Hello! Good morning.')
    expect(state.said).toEqual([{ text: 'Hello! Good morning.', voice: 'af_heart' }])
  })

  it('makes a sentence once: the second asking is served from what was kept', async () => {
    const { speaker, state } = fakeSpeaker()
    const server = start(speaker)

    await server.inject(audio('Nice to meet you.'))
    const again = await server.inject(audio('Nice to meet you.'))
    // Another voice, or another sentence, is another sound.
    await server.inject(audio('Nice to meet you.', 'hf_alpha'))

    expect(again.body).toBe('sound of af_heart: Nice to meet you.')
    expect(state.said).toHaveLength(2)
  })

  it('sends the mouth for a drawn face with the sound, the first time and from what was kept', async () => {
    const { speaker, state } = fakeSpeaker()
    const server = start(speaker)

    const first = await server.inject(audio('Good morning.'))
    const again = await server.inject(audio('Good morning.'))

    expect(first.headers[SPEECH_MOUTH_HEADER]).toBe('0c75m150o')
    expect(again.headers[SPEECH_MOUTH_HEADER]).toBe('0c75m150o')
    expect(state.said).toHaveLength(1)
  })

  it('keeps nothing of a sound that came without its mouth, and tells the browser not to either', async () => {
    // A speaking service older than this server: what it makes is not finished.
    const { speaker, state } = fakeSpeaker()
    state.mouth = null
    const server = start(speaker)

    const first = await server.inject(audio('Hm.'))
    expect(first.statusCode).toBe(200)
    expect(first.body).toBe('sound of af_heart: Hm.')
    expect(first.headers[SPEECH_MOUTH_HEADER]).toBeUndefined()
    expect(first.headers['cache-control']).toBe('no-store')

    // Once the service can say, the sound is made again, complete, and kept from then on.
    state.mouth = '0c75m150o'
    const again = await server.inject(audio('Hm.'))
    const third = await server.inject(audio('Hm.'))

    expect(again.headers[SPEECH_MOUTH_HEADER]).toBe('0c75m150o')
    expect(third.headers['cache-control']).toBe('public, max-age=31536000, immutable')
    expect(state.said).toHaveLength(2)
  })

  it('passes a Bengali text on as it was written, to a Bengali voice', async () => {
    const { speaker, state } = fakeSpeaker()
    const text = 'আপনি এখন বিভাগ ১-এ আছেন: কথা বলা শুরু করি।'

    const response = await start(speaker).inject(audio(text, 'bn_diya'))

    expect(response.statusCode).toBe(200)
    expect(state.said).toEqual([{ text, voice: 'bn_diya' }])
  })

  it('goes on serving what it has kept when the service stops answering', async () => {
    const { speaker, state } = fakeSpeaker()
    const server = start(speaker)
    await server.inject(audio('Goodbye.'))
    state.up = false

    expect((await server.inject(audio('Goodbye.'))).body).toBe('sound of af_heart: Goodbye.')
    const unheard = await server.inject(audio('See you tomorrow.'))
    expect(unheard.statusCode).toBe(503)
    expect(apiErrorSchema.parse(unheard.json()).error.code).toBe('unavailable')
    // What went wrong inside is for the log, not for the caller.
    expect(unheard.body).not.toContain('ECONNREFUSED')
  })

  it('is unavailable, not broken, when the service has never answered', async () => {
    const { speaker, state } = fakeSpeaker()
    state.up = false

    const response = await start(speaker).inject(audio('Hello.'))

    expect(response.statusCode).toBe(503)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('unavailable')
  })

  it('does not reuse a sound another model made', async () => {
    const first = fakeSpeaker('kokoro-one')
    await start(first.speaker).inject(audio('Hello.'))
    await app?.close()

    const second = fakeSpeaker('kokoro-two')
    await start(second.speaker).inject(audio('Hello.'))

    expect(second.state.said).toHaveLength(1)
  })

  it("keeps a voice's sounds under the model that says it, so a change to one model leaves the other's", async () => {
    const first = fakeSpeaker('kokoro-one', 'indic-one')
    const server = start(first.speaker)
    await server.inject(audio('Hello.'))
    await server.inject(audio('নমস্কার।', 'bn_diya'))
    await app?.close()

    // The Bengali model is replaced: its sound is made again, the English one is still good.
    const second = fakeSpeaker('kokoro-one', 'indic-two')
    const changed = start(second.speaker)
    await changed.inject(audio('Hello.'))
    await changed.inject(audio('নমস্কার।', 'bn_diya'))
    expect(second.state.said).toEqual([{ text: 'নমস্কার।', voice: 'bn_diya' }])
    await app?.close()

    // And the other way round.
    const third = fakeSpeaker('kokoro-two', 'indic-two')
    const again = start(third.speaker)
    await again.inject(audio('Hello.'))
    await again.inject(audio('নমস্কার।', 'bn_diya'))
    expect(third.state.said).toEqual([{ text: 'Hello.', voice: 'af_heart' }])
  })

  it.each([
    ['a voice that is not offered', audio('Hello.', 'zz_nobody'), 404, 'not_found'],
    ['a voice that is not a voice', audio('Hello.', '../etc'), 400, 'validation_failed'],
    ['nothing to say', audio('   '), 400, 'validation_failed'],
    ['more than a sentence or two', audio('x'.repeat(401)), 400, 'validation_failed'],
    ['no text at all', '/api/speech/audio?voice=af_heart', 400, 'validation_failed'],
  ])('refuses %s, and makes nothing', async (_, url, status, code) => {
    const { speaker, state } = fakeSpeaker()
    const response = await start(speaker).inject(url)

    expect(response.statusCode).toBe(status)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe(code)
    expect(state.said).toEqual([])
  })

  it('answers the address the app uses, which also names what comes with the sound', async () => {
    const { speaker, state } = fakeSpeaker()

    const response = await start(speaker).inject(`${audio('Hello.')}&with=lips`)

    expect(response.statusCode).toBe(200)
    expect(state.said).toEqual([{ text: 'Hello.', voice: 'af_heart' }])
  })

  it('turns away an address that asks for more than its share', async () => {
    const server = start(fakeSpeaker().speaker, 2)

    await server.inject(audio('One.'))
    await server.inject(audio('Two.'))
    const third = await server.inject(audio('Three.'))

    expect(third.statusCode).toBe(429)
    expect(apiErrorSchema.parse(third.json()).error.code).toBe('rate_limited')
  })
})
