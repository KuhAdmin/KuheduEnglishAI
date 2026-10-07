import { MicrophoneError, releaseStream, requestMicrophone } from './microphone'

export type Recording = {
  blob: Blob
  durationMs: number
  mimeType: string
}

export type ActiveRecording = {
  /** Ask the recording to end; `finished` then resolves. Safe to call more than once. */
  stop: () => void
  /** Resolves when the recording has ended, however it ended, with the microphone released. */
  finished: Promise<Recording>
}

export type StartRecordingOptions = {
  /** The recording ends by itself after this long. */
  maxDurationMs?: number
}

export const DEFAULT_MAX_RECORDING_MS = 30_000

// Safari records MP4/AAC, the others WebM/Opus; never assume one.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
]

/** The first container this browser can record, or `undefined` to let it choose. */
export function pickRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type))
}

/**
 * Start recording from the microphone. The microphone is taken for this recording only and
 * released the moment it ends. Rejects with `MicrophoneError`.
 */
export async function startRecording({
  maxDurationMs = DEFAULT_MAX_RECORDING_MS,
}: StartRecordingOptions = {}): Promise<ActiveRecording> {
  const stream = await requestMicrophone()

  let recorder: MediaRecorder
  try {
    const mimeType = pickRecordingMimeType()
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  } catch {
    releaseStream(stream)
    throw new MicrophoneError('unavailable')
  }

  const chunks: Blob[] = []
  const startedAt = performance.now()
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }

  const stop = () => {
    clearTimeout(limit)
    if (recorder.state !== 'inactive') recorder.stop()
  }
  const limit = setTimeout(stop, maxDurationMs)

  const finished = new Promise<Recording>((resolve) => {
    const settle = () => {
      clearTimeout(limit)
      releaseStream(stream)
      resolve({
        blob: new Blob(chunks, { type: recorder.mimeType }),
        durationMs: performance.now() - startedAt,
        mimeType: recorder.mimeType,
      })
    }
    recorder.onstop = settle
    // A device error mid-recording still ends it and frees the microphone.
    recorder.onerror = settle
  })

  recorder.start()
  return { stop, finished }
}
