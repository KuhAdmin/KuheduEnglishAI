import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apiErrorSchema, speechVoicesSchema, type SpeechVoice } from '@kuhedu/contracts'
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
// Bengali is said by Hindi's speakers under ids of its own, which do not say what the voice is.
const omega: SpeechVoice = {
  id: 'bn_omega',
  name: 'Omega',
  language: 'bn-IN',
  gender: 'male',
  default: true,
}

/** A speaking service that says nothing, counts what it was asked, and can be switched off. */
function fakeSpeaker(model = 'kokoro-test') {
  const state = { up: true, said: [] as { text: string; voice: string }[], model }
  const speaker: Speaker = {
    catalogue: async () => {
      if (!state.up) throw new Error('connect ECONNREFUSED 127.0.0.1:8788')
      return { model: state.model, voices: [heart, alpha, omega] }
    },
    speak: async (text, voice) => {
      if (!state.up) throw new Error('connect ECONNREFUSED 127.0.0.1:8788')
      state.said.push({ text, voice })
      return Buffer.from(`sound of ${voice}: ${text}`)
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
    expect(speechVoicesSchema.parse(response.json()).voices).toEqual([heart, alpha, omega])
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

  it('passes a Bengali text on as it was written, to a Bengali voice', async () => {
    const { speaker, state } = fakeSpeaker()
    const text = 'আপনি এখন বিভাগ ১-এ আছেন: কথা বলা শুরু করি।'

    const response = await start(speaker).inject(audio(text, 'bn_omega'))

    expect(response.statusCode).toBe(200)
    expect(state.said).toEqual([{ text, voice: 'bn_omega' }])
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

  it('turns away an address that asks for more than its share', async () => {
    const server = start(fakeSpeaker().speaker, 2)

    await server.inject(audio('One.'))
    await server.inject(audio('Two.'))
    const third = await server.inject(audio('Three.'))

    expect(third.statusCode).toBe(429)
    expect(apiErrorSchema.parse(third.json()).error.code).toBe('rate_limited')
  })
})
