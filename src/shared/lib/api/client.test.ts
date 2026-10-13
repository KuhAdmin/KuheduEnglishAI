import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError, apiRequest } from './client'

const schema = z.object({ id: z.string() })

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

afterEach(() => vi.unstubAllGlobals())

describe('apiRequest', () => {
  it('returns parsed data on success', async () => {
    mockFetch(200, { id: 'abc' })
    await expect(apiRequest('/x', { schema })).resolves.toEqual({ id: 'abc' })
  })

  it('throws ApiError on a non-2xx response', async () => {
    mockFetch(500, { message: 'boom' })
    await expect(apiRequest('/x', { schema })).rejects.toBeInstanceOf(ApiError)
  })

  it('reads why the server refused, and which fields are at fault', async () => {
    mockFetch(400, {
      error: {
        code: 'validation_failed',
        message: 'The request is not valid',
        fields: { email: 'auth.emailInvalid' },
      },
    })

    await expect(apiRequest('/x', { schema })).rejects.toMatchObject({
      status: 400,
      code: 'validation_failed',
      fields: { email: 'auth.emailInvalid' },
    })
  })

  it('claims no reason when the failure is not in the server’s own shape', async () => {
    // What a proxy answers when the server is down.
    mockFetch(502, { message: 'Bad Gateway' })

    await expect(apiRequest('/x', { schema })).rejects.toMatchObject({
      status: 502,
      code: undefined,
      fields: {},
    })
  })

  it('sends a recording as it is, under its own type, and JSON as JSON', async () => {
    mockFetch(200, { id: 'abc' })
    const recording = new Blob(['wav'], { type: 'audio/wav' })

    await apiRequest('/x', { method: 'POST', schema, blob: recording })
    expect(fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: recording,
        headers: expect.objectContaining({ 'Content-Type': 'audio/wav' }),
      }),
    )

    mockFetch(200, { id: 'abc' })
    await apiRequest('/x', { method: 'POST', schema, body: { a: 1 } })
    expect(fetch).toHaveBeenLastCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: '{"a":1}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })

  it('rejects responses that do not match the schema', async () => {
    mockFetch(200, { id: 42 })
    await expect(apiRequest('/x', { schema })).rejects.toThrow()
  })
})
