import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from './useWakeLock'

const release = vi.fn(async () => {})
const request = vi.fn(async () => ({ release }))

const withWakeLock = () =>
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true })

afterEach(() => {
  Reflect.deleteProperty(navigator, 'wakeLock')
  vi.clearAllMocks()
})

describe('useWakeLock', () => {
  it('keeps the screen on while active, and lets it go afterwards', async () => {
    withWakeLock()
    const { rerender } = renderHook(({ active }) => useWakeLock(active), {
      initialProps: { active: false },
    })
    expect(request).not.toHaveBeenCalled()

    rerender({ active: true })
    await waitFor(() => expect(request).toHaveBeenCalledWith('screen'))
    expect(release).not.toHaveBeenCalled()

    rerender({ active: false })
    await waitFor(() => expect(release).toHaveBeenCalledOnce())
  })

  it('asks again when the page comes back, since the browser drops the lock when hidden', async () => {
    withWakeLock()
    renderHook(() => useWakeLock(true))
    await waitFor(() => expect(request).toHaveBeenCalledOnce())

    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })

  it('does nothing on a browser without wake locks, or one that refuses', async () => {
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()

    withWakeLock()
    request.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow()
    await waitFor(() => expect(request).toHaveBeenCalledOnce())
  })
})
