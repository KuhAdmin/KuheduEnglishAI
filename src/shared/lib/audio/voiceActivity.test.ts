import { describe, expect, it } from 'vitest'
import { canListenForVoice, createVoiceDetector, listenForVoice, loudness } from './voiceActivity'

/** Feed a detector one reading every 50 ms and give back what it made of the last one. */
function hear(detect: ReturnType<typeof createVoiceDetector>, from: number, levels: number[]) {
  let reading = detect(levels[0] ?? 0, from)
  levels.slice(1).forEach((level, index) => {
    reading = detect(level, from + (index + 1) * 50)
  })
  return reading
}

const run = (level: number, count: number) => Array.from({ length: count }, () => level)

describe('createVoiceDetector', () => {
  it('hears nothing in a quiet room', () => {
    const detect = createVoiceDetector()
    expect(hear(detect, 0, run(0.004, 60))).toEqual({ heard: false, lastVoiceAt: null })
  })

  it('hears a voice that rises clearly above the room, and remembers when it last did', () => {
    const detect = createVoiceDetector()
    hear(detect, 0, run(0.004, 20))
    // 1000 ms on: half a second of speech.
    const speaking = hear(detect, 1000, run(0.12, 10))
    expect(speaking).toEqual({ heard: true, lastVoiceAt: 1450 })

    // Quiet again: still heard, and the time of the last sound does not move.
    expect(hear(detect, 1500, run(0.004, 40))).toEqual({ heard: true, lastVoiceAt: 1450 })
  })

  it('does not take a click for a voice', () => {
    const detect = createVoiceDetector()
    hear(detect, 0, run(0.004, 20))
    // Loud for two readings only.
    expect(hear(detect, 1000, [0.4, 0.4, ...run(0.004, 10)]).heard).toBe(false)
  })

  it('learns how loud a noisy room is, and is not fooled by it', () => {
    const detect = createVoiceDetector()
    // Steady noise that would count as a voice in a quiet room.
    expect(hear(detect, 0, run(0.05, 80)).heard).toBe(false)
    // A voice still stands out of it.
    expect(hear(detect, 4000, run(0.3, 10)).heard).toBe(true)
  })

  it('keeps hearing a long sentence: speech does not become the room', () => {
    const detect = createVoiceDetector()
    hear(detect, 0, run(0.004, 20))
    // Ten seconds without a gap.
    expect(hear(detect, 1000, run(0.12, 200)).lastVoiceAt).toBe(10_950)
  })
})

describe('loudness', () => {
  it('is 0 for silence and grows with the sound', () => {
    expect(loudness(new Float32Array(8))).toBe(0)
    expect(loudness(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5)
    expect(loudness(new Float32Array(0))).toBe(0)
  })
})

describe('on a device that has not been prepared, or cannot measure sound', () => {
  it('says so instead of listening', () => {
    expect(canListenForVoice()).toBe(false)
    expect(listenForVoice({} as MediaStream, () => {})).toBeNull()
  })
})
