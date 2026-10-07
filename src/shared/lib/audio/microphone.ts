/**
 * Why the microphone could not be used.
 * - `denied`: the learner (or their browser settings) refused; they can change that.
 * - `unavailable`: no microphone, a browser without recording, or a page not served securely.
 */
export type MicrophoneProblem = 'denied' | 'unavailable'

export class MicrophoneError extends Error {
  readonly problem: MicrophoneProblem

  constructor(problem: MicrophoneProblem) {
    super(`Microphone ${problem}`)
    this.name = 'MicrophoneError'
    this.problem = problem
  }
}

/** Browsers only hand out the microphone on secure pages (https or localhost). */
export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
}

const DENIED_ERRORS = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError'])

export function classifyMicrophoneError(error: unknown): MicrophoneProblem {
  return error instanceof Error && DENIED_ERRORS.has(error.name) ? 'denied' : 'unavailable'
}

/**
 * Ask for the microphone — only ever from a tap, after explaining why. The caller owns the
 * returned stream and must pass it to `releaseStream` when done.
 */
export async function requestMicrophone(): Promise<MediaStream> {
  if (!isRecordingSupported()) throw new MicrophoneError('unavailable')
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (error) {
    throw new MicrophoneError(classifyMicrophoneError(error))
  }
}

/** Stop every track, which also turns off the browser's "recording" indicator. */
export function releaseStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}
