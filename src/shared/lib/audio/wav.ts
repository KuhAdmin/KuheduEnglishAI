/**
 * A recording as a WAV: one channel, 16 bits, at a rate the caller names.
 *
 * A browser records in a format of its own (webm in Chrome, mp4 in Safari), which the server
 * would need another program to read. A WAV needs none, and a word is small: about 100 KB.
 */

type OfflineContext = new (channels: number, length: number, rate: number) => OfflineAudioContext

const offlineContext = (): OfflineContext | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext?: OfflineContext })
        .webkitOfflineAudioContext)

/** Whether this browser can turn its own recording into a WAV. */
export const canMakeWav = (): boolean => offlineContext() !== undefined

/** A rate every browser decodes at, for the one that will not decode at the rate asked for. */
const COMMON_RATE = 44_100

function decode(Context: OfflineContext, bytes: ArrayBuffer, rate: number): Promise<AudioBuffer> {
  const context = new Context(1, rate, rate)
  // Answered by callback or by promise, whichever the browser has: older Safari has only the
  // first. The bytes are a copy, because decoding takes them from whoever holds them.
  return new Promise((resolve, reject) => {
    const answer = context.decodeAudioData(bytes.slice(0), resolve, reject) as
      Promise<AudioBuffer> | undefined
    answer?.then(resolve, reject)
  })
}

/** Every channel as one, sample by sample. */
function asOneChannel(buffer: AudioBuffer): Float32Array {
  const mixed = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    buffer.getChannelData(channel).forEach((sample, at) => {
      mixed[at] = (mixed[at] ?? 0) + sample / buffer.numberOfChannels
    })
  }
  return mixed
}

/** The same sound at another rate, each new sample taken between its two nearest old ones. */
export function resample(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to || samples.length === 0) return samples
  const length = Math.max(1, Math.round((samples.length * to) / from))
  const resampled = new Float32Array(length)
  for (let at = 0; at < length; at += 1) {
    const where = (at * from) / to
    const before = Math.min(Math.floor(where), samples.length - 1)
    const after = Math.min(before + 1, samples.length - 1)
    const share = where - before
    resampled[at] = (samples[before] ?? 0) * (1 - share) + (samples[after] ?? 0) * share
  }
  return resampled
}

/** Samples from -1 to 1 as a WAV file of 16-bit numbers. */
export function encodeWav(samples: Float32Array, rate: number): Blob {
  const HEADER = 44
  const bytes = new DataView(new ArrayBuffer(HEADER + samples.length * 2))
  const write = (at: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      bytes.setUint8(at + index, text.charCodeAt(index))
    }
  }

  write(0, 'RIFF')
  bytes.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  bytes.setUint32(16, 16, true)
  // Plain numbers, one channel.
  bytes.setUint16(20, 1, true)
  bytes.setUint16(22, 1, true)
  bytes.setUint32(24, rate, true)
  bytes.setUint32(28, rate * 2, true)
  bytes.setUint16(32, 2, true)
  bytes.setUint16(34, 16, true)
  write(36, 'data')
  bytes.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, at) => {
    const held = Math.max(-1, Math.min(1, sample))
    bytes.setInt16(HEADER + at * 2, Math.round(held * 0x7fff), true)
  })
  return new Blob([bytes], { type: 'audio/wav' })
}

/**
 * A browser's own recording as a WAV at `rate`, no longer than `maxSeconds`. Throws where the
 * browser cannot decode what it recorded: the caller then has nothing to send.
 */
export async function recordingToWav(
  recording: Blob,
  rate: number,
  maxSeconds: number,
): Promise<Blob> {
  const Context = offlineContext()
  if (!Context) throw new Error('This browser cannot decode a recording')
  const bytes = await recording.arrayBuffer()

  let decoded: AudioBuffer
  try {
    // Decoding brings the sound to the rate of the context it is decoded in.
    decoded = await decode(Context, bytes, rate)
  } catch {
    decoded = await decode(Context, bytes, COMMON_RATE)
  }
  const samples = resample(asOneChannel(decoded), decoded.sampleRate, rate)
  return encodeWav(samples.subarray(0, maxSeconds * rate), rate)
}
