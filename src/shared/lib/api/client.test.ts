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

  it('rejects responses that do not match the schema', async () => {
    mockFetch(200, { id: 42 })
    await expect(apiRequest('/x', { schema })).rejects.toThrow()
  })
})
