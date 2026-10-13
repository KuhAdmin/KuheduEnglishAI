import { afterEach, describe, expect, it, vi } from 'vitest'
import { canMakeWav, encodeWav, recordingToWav, resample } from './wav'

const text = (bytes: DataView, from: number, to: number) =>
  String.fromCharCode(...new Uint8Array(bytes.buffer.slice(from, to)))

afterEach(() => vi.unstubAllGlobals())

describe('encodeWav', () => {
  it('writes one channel of 16-bit numbers under a header that says so', async () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16_000)
    const bytes = new DataView(await wav.arrayBuffer())

    expect(wav.type).toBe('audio/wav')
    expect(bytes.byteLength).toBe(44 + 4 * 2)
    expect(text(bytes, 0, 4)).toBe('RIFF')
    expect(text(bytes, 8, 12)).toBe('WAVE')
    expect(text(bytes, 36, 40)).toBe('data')
    // What follows the first eight bytes, and what follows the header.
    expect(bytes.getUint32(4, true)).toBe(36 + 8)
    expect(bytes.getUint32(40, true)).toBe(8)
    // Plain numbers, one channel, the rate, two bytes a sample.
    expect(bytes.getUint16(20, true)).toBe(1)
    expect(bytes.getUint16(22, true)).toBe(1)
    expect(bytes.getUint32(24, true)).toBe(16_000)
    expect(bytes.getUint32(28, true)).toBe(32_000)
    expect(bytes.getUint16(34, true)).toBe(16)

    expect(bytes.getInt16(44, true)).toBe(0)
    expect(bytes.getInt16(46, true)).toBe(16_384)
    expect(bytes.getInt16(48, true)).toBe(-16_383)
    expect(bytes.getInt16(50, true)).toBe(32_767)
  })

  it('holds a sound that is too loud at the loudest there is', async () => {
    const bytes = new DataView(await encodeWav(new Float32Array([3, -3]), 16_000).arrayBuffer())

    expect(bytes.getInt16(44, true)).toBe(32_767)
    expect(bytes.getInt16(46, true)).toBe(-32_767)
  })

  it('makes a file of a recording with nothing in it', async () => {
    expect((await encodeWav(new Float32Array(0), 16_000).arrayBuffer()).byteLength).toBe(44)
  })
})

describe('resample', () => {
  it('leaves a sound already at the rate as it is', () => {
    const samples = new Float32Array([0.1, 0.2, 0.3])
    expect(resample(samples, 16_000, 16_000)).toBe(samples)
  })

  it('keeps the sound’s length in time and its shape', () => {
    // A second rising evenly from 0 to nearly 1.
    const ramp = Float32Array.from({ length: 48_000 }, (_, at) => at / 48_000)

    const lower = resample(ramp, 48_000, 16_000)

    expect(lower).toHaveLength(16_000)
    expect(lower[0]).toBeCloseTo(0)
    expect(lower[8_000]).toBeCloseTo(0.5, 3)
    expect(lower[15_999]).toBeCloseTo(15_999 / 16_000, 3)
  })

  it('fills in between samples when the rate goes up', () => {
    expect([...resample(new Float32Array([0, 1]), 1, 2)]).toEqual([0, 0.5, 1, 1])
  })
})

describe('recordingToWav', () => {
  /** A browser that decodes anything to two channels of the same second of sound. */
  function decoding(rateOf: (asked: number) => number | Error) {
    class FakeOfflineContext {
      readonly rate: number
      constructor(_channels: number, _length: number, rate: number) {
        this.rate = rate
      }

      async decodeAudioData(): Promise<AudioBuffer> {
        const rate = rateOf(this.rate)
        if (rate instanceof Error) throw rate
        const left = new Float32Array(rate).fill(0.5)
        const right = new Float32Array(rate).fill(0.1)
        return {
          length: rate,
          sampleRate: rate,
          numberOfChannels: 2,
          getChannelData: (channel: number) => (channel === 0 ? left : right),
        } as unknown as AudioBuffer
      }
    }
    vi.stubGlobal('OfflineAudioContext', FakeOfflineContext)
  }

  it('makes one channel at the rate asked for, of what the browser recorded', async () => {
    decoding((asked) => asked)

    const wav = await recordingToWav(new Blob(['webm']), 16_000, 15)
    const bytes = new DataView(await wav.arrayBuffer())

    expect(canMakeWav()).toBe(true)
    expect(bytes.getUint32(24, true)).toBe(16_000)
    expect(bytes.byteLength).toBe(44 + 16_000 * 2)
    // Two channels as one: half-way between them.
    expect(bytes.getInt16(44, true)).toBe(Math.round(0.3 * 32_767))
  })

  it('brings the sound to the rate itself where the browser will not decode at it', async () => {
    decoding((asked) => (asked === 16_000 ? new Error('NotSupportedError') : asked))

    const bytes = new DataView(
      await (await recordingToWav(new Blob(['mp4']), 16_000, 15)).arrayBuffer(),
    )

    expect(bytes.getUint32(24, true)).toBe(16_000)
    // A second at 44.1 kHz is still a second.
    expect(bytes.byteLength).toBe(44 + 16_000 * 2)
  })

  it('sends no more than the longest recording that is checked', async () => {
    decoding((asked) => asked)

    const wav = await recordingToWav(new Blob(['webm']), 16_000, 0.5)

    expect((await wav.arrayBuffer()).byteLength).toBe(44 + 8_000 * 2)
  })

  it('fails where the browser cannot read back what it recorded', async () => {
    decoding(() => new Error('EncodingError'))
    await expect(recordingToWav(new Blob(['?']), 16_000, 15)).rejects.toThrow()

    vi.stubGlobal('OfflineAudioContext', undefined)
    expect(canMakeWav()).toBe(false)
    await expect(recordingToWav(new Blob(['?']), 16_000, 15)).rejects.toThrow()
  })
})
