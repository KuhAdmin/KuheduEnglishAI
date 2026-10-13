import { apiErrorSchema, healthSchema } from '@kuhedu/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { buildApp, type App } from '../src/app.ts'
import { readEnv } from '../src/env.ts'
import { HttpError } from '../src/plugins/errors.ts'

let app: App | undefined

function start(databaseUp = true) {
  app = buildApp({ checkDatabase: async () => databaseUp })
  return app
}

afterEach(async () => {
  await app?.close()
  app = undefined
})

describe('GET /api/health', () => {
  it('answers in the shape the app expects, and says the database is reachable', async () => {
    const response = await start().inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    const health = healthSchema.parse(response.json())
    expect(health.database).toBe('ok')
    expect(Number.isNaN(Date.parse(health.time))).toBe(false)
  })

  it('still answers when the database does not, and says so', async () => {
    const response = await start(false).inject({ method: 'GET', url: '/api/health' })

    expect(response.statusCode).toBe(200)
    expect(healthSchema.parse(response.json()).database).toBe('down')
  })
})

describe('failures', () => {
  it('answers an unknown path with the shared error shape', async () => {
    const response = await start().inject({ method: 'GET', url: '/api/nothing-here' })

    expect(response.statusCode).toBe(404)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('not_found')
  })

  it('tells a caller what a route chose to tell, fields included', async () => {
    const server = start()
    server.get('/api/refuses', () => {
      throw new HttpError(409, 'conflict', 'Someone saved before you', { title: 'admin.stale' })
    })

    const response = await server.inject({ method: 'GET', url: '/api/refuses' })

    expect(response.statusCode).toBe(409)
    expect(apiErrorSchema.parse(response.json()).error).toEqual({
      code: 'conflict',
      message: 'Someone saved before you',
      fields: { title: 'admin.stale' },
    })
  })

  it('says which field of a request is wrong', async () => {
    const server = start()
    server.post(
      '/api/echo',
      { schema: { body: z.object({ week: z.number().int().min(1).max(50) }) } },
      (request) => request.body,
    )

    const response = await server.inject({
      method: 'POST',
      url: '/api/echo',
      payload: { week: 51 },
    })

    expect(response.statusCode).toBe(400)
    const { error } = apiErrorSchema.parse(response.json())
    expect(error.code).toBe('validation_failed')
    expect(Object.keys(error.fields ?? {})).toEqual(['week'])
  })

  it('refuses malformed JSON as the caller’s mistake, not the server’s', async () => {
    const server = start()
    server.post('/api/echo', (request) => request.body)

    const response = await server.inject({
      method: 'POST',
      url: '/api/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{ not json',
    })

    expect(response.statusCode).toBe(400)
    expect(apiErrorSchema.parse(response.json()).error.code).toBe('validation_failed')
  })

  it('gives nothing away when the server itself fails', async () => {
    const server = start()
    server.get('/api/breaks', () => {
      throw new Error('password for user "postgres" rejected at 10.0.0.5')
    })

    const response = await server.inject({ method: 'GET', url: '/api/breaks' })

    expect(response.statusCode).toBe(500)
    expect(apiErrorSchema.parse(response.json()).error).toEqual({
      code: 'internal',
      message: 'Something went wrong on the server',
    })
    expect(response.body).not.toContain('postgres')
  })
})

describe('readEnv', () => {
  const database = { PGDATABASE: 'kuhedu_test', PGUSER: 'someone', PGPASSWORD: 'a~!@#$%b' }

  it('fills in where the server listens and where the database is', () => {
    expect(readEnv(database)).toMatchObject({
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: 8787,
      PGHOST: 'localhost',
      PGPORT: 5432,
      PGPASSWORD: 'a~!@#$%b',
    })
  })

  it('names what is missing without repeating any value', () => {
    const attempt = vi.fn(() => readEnv({ ...database, PGPASSWORD: '', PORT: 'eighty' }))

    expect(attempt).toThrow(/PGPASSWORD/)
    expect(attempt).toThrow(/PORT/)
    expect(attempt).not.toThrow(/eighty|someone/)
  })

  it('takes Google’s id and secret together or not at all, and repeats neither', () => {
    const google = { GOOGLE_CLIENT_ID: 'an-id', GOOGLE_CLIENT_SECRET: 'a-secret' }
    expect(readEnv({ ...database, ...google })).toMatchObject(google)
    expect(readEnv(database).GOOGLE_CLIENT_ID).toBeUndefined()

    for (const half of [{ GOOGLE_CLIENT_ID: 'an-id' }, { GOOGLE_CLIENT_SECRET: 'a-secret' }]) {
      const attempt = vi.fn(() => readEnv({ ...database, ...half }))
      expect(attempt).toThrow(/GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together/)
      expect(attempt).not.toThrow(/an-id|a-secret/)
    }
  })
})
