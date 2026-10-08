/** A length of time as minutes and seconds, e.g. "0:07": how long a recording has run. */
export function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
