import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { isSafeAssetUrl } from './fields'
import { parseSettings, settingsRepository, SettingsStorageError } from './settingsRepository'
import { useAppConfig } from './useAppConfig'

const schema = z.object({ title: z.string().catch('Default title') })
const defaults = { title: 'Default title' }
const options = { name: 'test-settings', schema, defaults }

beforeEach(() => localStorage.clear())

describe('settingsRepository', () => {
  it('stores, reads and removes a settings object', () => {
    expect(settingsRepository.readRaw('a')).toBeNull()

    settingsRepository.write('a', { title: 'Hello' })
    expect(JSON.parse(settingsRepository.readRaw('a') ?? '')).toEqual({ title: 'Hello' })

    settingsRepository.remove('a')
    expect(settingsRepository.readRaw('a')).toBeNull()
  })

  it('tells subscribers about changes in this tab and in other tabs', () => {
    const listener = vi.fn()
    const unsubscribe = settingsRepository.subscribe(listener)

    settingsRepository.write('a', 1)
    expect(listener).toHaveBeenCalledTimes(1)

    // What the browser fires in every other tab when one tab writes.
    window.dispatchEvent(new StorageEvent('storage', { key: 'kuhedu-settings:a' }))
    expect(listener).toHaveBeenCalledTimes(2)

    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }))
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    settingsRepository.write('a', 2)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('reports a full browser storage as a SettingsStorageError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    expect(() => settingsRepository.write('a', 1)).toThrow(SettingsStorageError)
    vi.restoreAllMocks()
  })
})

describe('parseSettings', () => {
  it('returns undefined for missing or corrupt data', () => {
    expect(parseSettings(null, schema)).toBeUndefined()
    expect(parseSettings('{not json', schema)).toBeUndefined()
    expect(parseSettings('"a string"', schema)).toBeUndefined()
    expect(parseSettings('{"title":"Ok"}', schema)).toEqual({ title: 'Ok' })
  })
})

describe('useAppConfig', () => {
  it('returns the defaults until something is saved, then follows every save', () => {
    const { result } = renderHook(() => useAppConfig(options))
    expect(result.current).toBe(defaults)

    act(() => settingsRepository.write(options.name, { title: 'From admin' }))
    expect(result.current).toEqual({ title: 'From admin' })

    act(() => settingsRepository.remove(options.name))
    expect(result.current).toBe(defaults)
  })

  it('falls back to the defaults when the stored value is unusable', () => {
    localStorage.setItem('kuhedu-settings:test-settings', '{broken')
    const { result } = renderHook(() => useAppConfig(options))
    expect(result.current).toBe(defaults)
  })

  it('keeps returning the same object while nothing changes', () => {
    settingsRepository.write(options.name, { title: 'Stable' })
    const { result, rerender } = renderHook(() => useAppConfig(options))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})

describe('isSafeAssetUrl', () => {
  it.each([
    'https://cdn.example.com/a.webp',
    '/uploads/a.png',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/webp;base64,UklGRg==',
    'data:image/jpeg;base64,/9j/4AAQ',
  ])('accepts %s', (url) => expect(isSafeAssetUrl(url)).toBe(true))

  it.each([
    'javascript:alert(1)',
    'http://example.com/a.png',
    '//evil.example/a.png',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'data:text/html;base64,PGgxPg==',
    'data:image/png;base64,not base64!',
    `data:image/png;base64,${'A'.repeat(1_500_000)}`,
  ])('rejects %s', (url) => expect(isSafeAssetUrl(url)).toBe(false))
})
