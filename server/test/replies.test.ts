import {
  apiErrorSchema,
  REPLY_BYTES_MAX,
  replyAssessmentSchema,
  type SessionUser,
} from '@kuhedu/contracts'
import Fastify, { type FastifyInstance } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { afterEach, describe, expect, it } from 'vitest'
import type { Grader } from '../src/modules/conversation/grader.ts'
import type { Listener } from '../src/modules/conversation/listener.ts'
import { conversationRoutes, judgeReply } from '../src/modules/conversation/routes.ts'
import { namesIn, sameWords, stillTheirs, wordsOf } from '../src/modules/conversation/words.ts'
import { UnreadableRecording } from '../src/modules/pronunciation/scorer.ts'
import { registerErrorHandling } from '../src/plugins/errors.ts'
import { registerSecurity } from '../src/plugins/security.ts'

const learner: SessionUser = {
  id: 'learner-1',
  email: 'asha@example.com',
  emailVerified: true,
  role: 'learner',
  displayName: null,
  pictureUrl: null,
}

/** A recording as the app sends it: enough of a WAV to be taken for one. */
const wav = (bytes = 2000) => {
  const recording = Buffer.alloc(bytes)
  recording.write('RIFF', 0, 'latin1')
  recording.write('WAVE', 8, 'latin1')
  return recording
}

/** Something that hears the same words in every recording, and can be switched off. */
function fakeListener(heard: string | null = 'I fine.') {
  const state = { asked: [] as number[], fails: null as Error | null, heard }
  const listener: Listener = {
    write: async (recording) => {
      if (state.fails) throw state.fails
      state.asked.push(recording.length)
      return state.heard
    },
  }
  return { listener, state }
}

/** A teacher who gives the answers it was told to, and remembers what it was asked. */
function fakeGrader({ rewrite = (said: string) => said, answers = true } = {}) {
  const state = {
    rewritten: [] as string[],
    asked: [] as { partner: string; reply: string }[],
    fails: null as Error | null,
  }
  const grader: Grader = {
    rewrite: async (said) => {
      if (state.fails) throw state.fails
      state.rewritten.push(said)
      return rewrite(said)
    },
    answers: async (partner, reply) => {
      if (state.fails) throw state.fails
      state.asked.push({ partner, reply })
      return answers
    },
  }
  return { grader, state }
}

let app: FastifyInstance | undefined

/**
 * The routes with someone signed in, or nobody. The cookie that says who (`plugins/session.ts`)
 * needs the database; here a stand-in says it, so that these need none.
 */
function start(
  listener: Listener,
  grader: Grader,
  user: SessionUser | null = learner,
  requestsPerMinute = 100,
) {
  const server = Fastify().withTypeProvider<ZodTypeProvider>()
  server.setValidatorCompiler(validatorCompiler)
  server.setSerializerCompiler(serializerCompiler)
  registerErrorHandling(server)
  registerSecurity(server)
  server.decorateRequest('user', null)
  server.addHook('onRequest', async (request) => {
    request.user = user
  })
  void server.register(conversationRoutes, {
    prefix: '/api/conversation',
    listener,
    grader,
    requestsPerMinute,
    logError: () => {},
  })
  app = server
  return server
}

const HOW_ARE_YOU = 'partner=How+are+you%3F&suggested=I%E2%80%99m+fine%2C+thank+you.+And+you%3F'

const check = (query = HOW_ARE_YOU, recording: Buffer = wav()) => ({
  method: 'POST' as const,
  url: `/api/conversation/replies?${query}`,
  headers: { 'content-type': 'audio/wav' },
  payload: recording,
})

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('POST /api/conversation/replies', () => {
  it('writes down what was said, and answers with whether it fits and a better way to say it', async () => {
    const { listener, state: heard } = fakeListener('I fine.')
    const { grader, state: asked } = fakeGrader({ rewrite: () => 'I am fine.' })

    const response = await start(listener, grader).inject(check())

    expect(response.statusCode).toBe(200)
    expect(replyAssessmentSchema.parse(response.json())).toEqual({
      heard: 'I fine.',
      fits: true,
      better: 'I am fine.',
    })
    expect(heard.asked).toEqual([2000])
    expect(asked.rewritten).toEqual(['I fine.'])
    // Whether it answers is asked of the corrected sentence: a slip is not a wrong answer.
    expect(asked.asked).toEqual([{ partner: 'How are you?', reply: 'I am fine.' }])
    // About one person at one moment: nothing between here and the app keeps it.
    expect(response.headers['cache-control']).toBe('no-store')
  })

  it('says only that nothing was heard when no words were', async () => {
    const { listener } = fakeListener(null)
    const { grader, state } = fakeGrader()

    const response = await start(listener, grader).inject(check())

    expect(response.json()).toEqual({ heard: null, fits: null, better: null })
    expect(state.rewritten).toEqual([])
    expect(state.asked).toEqual([])
  })

  it('needs only the line that is answered', async () => {
    const { listener } = fakeListener('Good morning.')
    const { grader, state } = fakeGrader()

    const response = await start(listener, grader).inject(check('partner=Hello!+Good+morning.'))

    expect(response.json()).toEqual({ heard: 'Good morning.', fits: true, better: null })
    expect(state.asked).toEqual([{ partner: 'Hello! Good morning.', reply: 'Good morning.' }])
  })

  it('is for a learner who is signed in, with a verified address', async () => {
    const { listener, state } = fakeListener()
    const { grader } = fakeGrader()

    const nobody = await start(listener, grader, null).inject(check())
    expect(nobody.statusCode).toBe(401)
    expect(apiErrorSchema.parse(nobody.json()).error.code).toBe('unauthenticated')
    await app?.close()

    const unfinished = await start(listener, grader, { ...learner, emailVerified: false }).inject(
      check(),
    )
    expect(unfinished.statusCode).toBe(403)
    expect(apiErrorSchema.parse(unfinished.json()).error.code).toBe('forbidden')
    expect(state.asked).toEqual([])
  })

  it('turns away a request from another site', async () => {
    const { listener, state } = fakeListener()
    const request = check()

    const response = await start(listener, fakeGrader().grader).inject({
      ...request,
      headers: { ...request.headers, origin: 'https://elsewhere.example' },
    })

    expect(response.statusCode).toBe(403)
    expect(state.asked).toEqual([])
  })

  it.each([
    ['something that is not a WAV', check(HOW_ARE_YOU, Buffer.from('a'.repeat(200))), 400],
    ['a recording too large', check(HOW_ARE_YOU, wav(REPLY_BYTES_MAX + 1)), 413],
    ['no line to answer', check(''), 400],
    ['a line too long', check(`partner=${'x'.repeat(401)}`), 400],
    [
      'a recording sent as something else',
      { ...check(), headers: { 'content-type': 'application/json' }, payload: '{}' },
      400,
    ],
  ])('refuses %s, and has nothing heard', async (_, request, status) => {
    const { listener, state } = fakeListener()

    const response = await start(listener, fakeGrader().grader).inject(request)

    expect(response.statusCode).toBe(status)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('validation_failed')
    expect(state.asked).toEqual([])
  })

  it('says so when the recording could not be read', async () => {
    const { listener, state } = fakeListener()
    state.fails = new UnreadableRecording('The scoring service answered 422')

    const response = await start(listener, fakeGrader().grader).inject(check())

    expect(response.statusCode).toBe(400)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('validation_failed')
  })

  it.each([
    ['nothing writes down what was said', 'listener'],
    ['nothing reads it', 'grader'],
  ] as const)('is unavailable, not broken, when %s', async (_, down) => {
    const { listener, state: hearing } = fakeListener('I fine.')
    const { grader, state: reading } = fakeGrader()
    const failure = new Error('connect ECONNREFUSED 127.0.0.1:11434')
    if (down === 'listener') hearing.fails = failure
    else reading.fails = failure

    const response = await start(listener, grader).inject(check())

    expect(response.statusCode).toBe(503)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('unavailable')
    // What went wrong inside is for the log, and what was said is for nobody.
    expect(response.body).not.toContain('ECONNREFUSED')
    expect(response.body).not.toContain('fine')
  })

  it('turns away a learner who asks for more than their share', async () => {
    const server = start(fakeListener().listener, fakeGrader().grader, learner, 2)

    await server.inject(check())
    await server.inject(check())
    const third = await server.inject(check())

    expect(third.statusCode).toBe(429)
    expect(apiErrorSchema.parse(third.json()).error.code).toBe('rate_limited')
  })
})

describe('what is said of a reply that was heard', () => {
  const turn = { partner: 'How are you?', suggested: 'I’m fine, thank you. And you?' }

  it('takes the suggested reply as right without asking anything', async () => {
    const { grader, state } = fakeGrader({ answers: false })

    // As a recogniser writes it: other marks, the short form written out.
    const judged = await judgeReply(grader, { ...turn, heard: 'I am fine. Thank you, and you?' })

    expect(judged).toEqual({ fits: true, better: null })
    expect(state.rewritten).toEqual([])
    expect(state.asked).toEqual([])
  })

  it('has no better sentence for one that came back the same', async () => {
    const { grader, state } = fakeGrader({ rewrite: () => 'i am good' })

    expect(await judgeReply(grader, { ...turn, heard: 'I’m good.' })).toEqual({
      fits: true,
      better: null,
    })
    expect(state.asked).toEqual([{ partner: 'How are you?', reply: 'I’m good.' }])
  })

  it('does not correct one word, which has no grammar', async () => {
    const { grader, state } = fakeGrader({ rewrite: () => 'I am fine.' })

    expect(await judgeReply(grader, { ...turn, heard: 'Fine.' })).toEqual({
      fits: true,
      better: null,
    })
    expect(state.rewritten).toEqual([])
  })

  it.each([
    ['answers the sentence instead of correcting it', 'I fine.', 'That is good to hear!'],
    ['corrects a name it does not know', 'I am Asha.', 'I am ash.'],
    ['drops the name', 'Me Rekha.', 'Me.'],
    ['writes far more than was said', 'I fine.', 'I am fine, thank you, and how are you today?'],
    ['writes nothing', 'I fine.', '   '],
  ])('shows no better sentence when the model %s', async (_, heard, rewrite) => {
    const { grader, state } = fakeGrader({ rewrite: () => rewrite })

    expect(await judgeReply(grader, { partner: 'How are you?', heard })).toEqual({
      fits: true,
      better: null,
    })
    // And what it wrote is not what is asked about either.
    expect(state.asked).toEqual([{ partner: 'How are you?', reply: heard }])
  })

  it('says when a reply does not answer what was said', async () => {
    const { grader } = fakeGrader({ answers: false })

    expect(await judgeReply(grader, { ...turn, heard: 'My name is Asha.' })).toEqual({
      fits: false,
      better: null,
    })
  })

  it('sends a better sentence on one line, and no longer than a line may be', async () => {
    const { grader } = fakeGrader({ rewrite: () => `I am\n fine.${' '.repeat(500)}` })

    expect((await judgeReply(grader, { partner: 'How are you?', heard: 'I fine.' })).better).toBe(
      'I am fine.',
    )
  })
})

describe('a sentence as words', () => {
  it('is the same whatever its capitals, marks and short forms', () => {
    expect(wordsOf('I’m fine, thank you. And you?')).toEqual(
      'i am fine thank you and you'.split(' '),
    )
    expect(sameWords("What's your name?", 'what is your name')).toBe(true)
    expect(sameWords('Okay, good bye!', 'ok goodbye')).toBe(true)
    expect(sameWords('I fine.', 'I am fine.')).toBe(false)
    expect(wordsOf('  …  ')).toEqual([])
  })

  it('tells a name by its capital, away from the start of a sentence', () => {
    expect(namesIn('My name is Asha. I am from Kolkata.')).toEqual(['Asha', 'Kolkata'])
    // "I", and the word that opens a sentence, have their capitals for another reason.
    expect(namesIn('Hello. I am fine and I’m happy.')).toEqual([])
  })

  it('knows a correction from another sentence', () => {
    expect(stillTheirs('My name Rekha.', 'My name is Rekha.')).toBe(true)
    expect(stillTheirs('Me Rekha.', 'I am Rekha.')).toBe(true)
    expect(stillTheirs('See you late.', 'See you later.')).toBe(true)
    expect(stillTheirs('I am Asha.', 'I am ash.')).toBe(false)
    expect(stillTheirs('I fine.', 'Good to hear.')).toBe(false)
  })
})
