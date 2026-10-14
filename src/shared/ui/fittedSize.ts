/**
 * The smallest a fitted line is drawn, in rem. Under it a line is no longer read with ease, so
 * a text that would need less wraps at this size instead: two lines that can be read, not one
 * that cannot.
 */
export const FIT_TEXT_MIN_REM = 0.6875

/**
 * The size, in px, at which a line that needs `needed` px at `base` fits in `available`: `base`
 * itself when it already does, and `null` when it would have to go under `min`.
 */
export function fittedSize(
  base: number,
  available: number,
  needed: number,
  min: number,
): number | null {
  if (needed <= available) return base
  // A tenth of a pixel down, never up: a line a hair too long would wrap.
  const size = Math.floor(((base * available) / needed) * 10) / 10
  return size >= min ? size : null
}
