/** A WAV begins by saying that it is one. */
export const isWav = (body: unknown): body is Buffer =>
  Buffer.isBuffer(body) &&
  body.length > 44 &&
  body.toString('latin1', 0, 4) === 'RIFF' &&
  body.toString('latin1', 8, 12) === 'WAVE'

/** The content types a recording is sent under. */
export const WAV_TYPES = ['audio/wav', 'audio/x-wav', 'audio/wave']
