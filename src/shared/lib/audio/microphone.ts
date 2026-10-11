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

// What is known about the permission without asking: what the browser says of it, and whether
// it has handed the microphone over on this page (some browsers allow one visit at a time and
// go on saying "ask").
let granted = false
let opened = false
let watching = false

/**
 * Whether opening the microphone now would ask the learner nothing: the browser has already
 * allowed it. Only then may the app open it without a tap.
 */
export function microphoneAllowed(): boolean {
  return granted || opened
}

/**
 * Find out, without asking the learner anything, whether the microphone is already allowed,
 * and keep up with a change of mind. `microphoneAllowed` has the answer once it is known.
 */
export function primeMicrophonePermission(): void {
  if (watching || typeof navigator === 'undefined') return
  if (typeof navigator.permissions?.query !== 'function') return
  watching = true
  navigator.permissions
    .query({ name: 'microphone' as PermissionName })
    .then((status) => {
      const read = () => {
        granted = status.state === 'granted'
        if (status.state === 'denied') opened = false
      }
      read()
      status.onchange = read
    })
    // Some browsers do not answer for the microphone; a tap then finds out.
    .catch(() => {})
}

/**
 * Ask for the microphone — only ever from a tap, after explaining why, unless
 * `microphoneAllowed` says there is nothing left to ask. The caller owns the returned stream
 * and must pass it to `releaseStream` when done.
 */
export async function requestMicrophone(): Promise<MediaStream> {
  if (!isRecordingSupported()) throw new MicrophoneError('unavailable')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    opened = true
    return stream
  } catch (error) {
    opened = false
    throw new MicrophoneError(classifyMicrophoneError(error))
  }
}

/** Stop every track, which also turns off the browser's "recording" indicator. */
export function releaseStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}
