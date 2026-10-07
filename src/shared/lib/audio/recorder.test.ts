import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRecordingSupported, MicrophoneError, requestMicrophone } from './microphone'
import { pickRecordingMimeType, startRecording } from './recorder'

let supportedTypes: string[] = []
let failConstruction = false
let lastRecorder: FakeRecorder | null = null

class FakeRecorder {
  static isTypeSupported = (type: string) => supportedTypes.includes(type)

  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(_stream: MediaStream, options?: { mimeType?: string }) {
    if (failConstruction) throw new Error('NotSupportedError')
    this.mimeType = options?.mimeType ?? 'audio/webm'
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- the test needs the instance
    lastRecorder = this
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['sound']) })
    this.onstop?.()
  }
}

const track = { stop: vi.fn() }
const stream = { getTracks: () => [track] } as unknown as MediaStream
const getUserMedia = vi.fn(async () => stream)

const namedError = (name: string) => Object.assign(new Error(name), { name })

beforeEach(() => {
  supportedTypes = ['audio/webm;codecs=opus', 'audio/webm']
  failConstruction = false
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('pickRecordingMimeType', () => {
  it('takes what the browser can record, WebM or MP4', () => {
    expect(pickRecordingMimeType()).toBe('audio/webm;codecs=opus')
    // Safari
    supportedTypes = ['audio/mp4']
    expect(pickRecordingMimeType()).toBe('audio/mp4')
    supportedTypes = []
    expect(pickRecordingMimeType()).toBeUndefined()
  })
})

describe('startRecording', () => {
  it('records until stopped, then frees the microphone', async () => {
    supportedTypes = ['audio/mp4']
    const recording = await startRecording()
    expect(track.stop).not.toHaveBeenCalled()

    recording.stop()
    const result = await recording.finished

    expect(result.mimeType).toBe('audio/mp4')
    expect(result.blob.size).toBeGreaterThan(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(track.stop).toHaveBeenCalledOnce()
    // Stopping twice is harmless.
    expect(() => recording.stop()).not.toThrow()
  })

  it('ends by itself at the time limit', async () => {
    vi.useFakeTimers()
    const recording = await startRecording({ maxDurationMs: 5000 })
    await vi.advanceTimersByTimeAsync(5000)

    await expect(recording.finished).resolves.toMatchObject({ mimeType: 'audio/webm;codecs=opus' })
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('frees the microphone when the device fails mid-recording', async () => {
    const recording = await startRecording()
    // The recorder reports an error and never a clean stop.
    lastRecorder?.onerror?.()

    await expect(recording.finished).resolves.toMatchObject({ durationMs: expect.any(Number) })
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('tells a refusal apart from a missing microphone', async () => {
    getUserMedia.mockRejectedValueOnce(namedError('NotAllowedError'))
    await expect(startRecording()).rejects.toMatchObject({ problem: 'denied' })

    getUserMedia.mockRejectedValueOnce(namedError('NotFoundError'))
    await expect(startRecording()).rejects.toMatchObject({ problem: 'unavailable' })
  })

  it('frees the microphone if the browser cannot record after all', async () => {
    failConstruction = true
    await expect(startRecording()).rejects.toBeInstanceOf(MicrophoneError)
    expect(track.stop).toHaveBeenCalledOnce()
  })
})

describe('without recording support', () => {
  it('reports the microphone as unavailable instead of throwing', async () => {
    vi.unstubAllGlobals()
    expect(isRecordingSupported()).toBe(false)
    await expect(requestMicrophone()).rejects.toMatchObject({ problem: 'unavailable' })
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('needs a secure page: no media devices means unavailable', async () => {
    Reflect.deleteProperty(navigator, 'mediaDevices')
    await expect(startRecording()).rejects.toMatchObject({ problem: 'unavailable' })
  })
})
