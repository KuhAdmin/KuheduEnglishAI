/**
 * Mouth shapes for a text that is being said aloud. The browser's text-to-speech gives no sound
 * to listen to and no mouth shapes of its own, only (on some devices) the moment each word
 * begins, so the shapes are worked out from the spelling. It reads as speech; it is not exact.
 */

/**
 * `rest` is the mouth when nothing is being said. The others are shapes of speech: lips
 * `closed` (m, b, p), nearly closed with the teeth showing (`mid`: e, and most consonants),
 * `open` (a), `wide` (i) and `round` (o, u, w).
 */
export type MouthShape = 'rest' | 'closed' | 'mid' | 'open' | 'wide' | 'round'

const VOWELS: Record<string, MouthShape> = {
  a: 'open',
  e: 'mid',
  i: 'wide',
  o: 'round',
  u: 'round',
  y: 'wide',
}
const LIPS_TOGETHER = new Set(['m', 'b', 'p'])
const LIPS_ROUNDED = new Set(['w', 'q'])
// For a script there is no table for (Bengali, Devanagari): a letter always gets the same shape,
// so a sentence looks the same each time it is said.
const ANY_LETTER: MouthShape[] = ['open', 'mid', 'wide', 'round']

/** The shapes a mouth goes through to say a text, one after another, never the same one twice. */
export function mouthShapesFor(text: string): MouthShape[] {
  const shapes: MouthShape[] = []
  const add = (shape: MouthShape) => {
    if (shapes.at(-1) !== shape) shapes.push(shape)
  }

  // Between words, and at punctuation, the lips come together; held back until the next word
  // begins, so nothing is added after the last one.
  let gap = false
  // Decomposed, so "é" is read as "e" and its accent, a mark, is skipped.
  for (const char of text.toLowerCase().normalize('NFD')) {
    if (/\p{M}/u.test(char)) continue
    if (!/\p{L}/u.test(char)) {
      gap = shapes.length > 0
      continue
    }
    if (gap) add('closed')
    gap = false
    const vowel = VOWELS[char]
    if (vowel) add(vowel)
    else if (LIPS_TOGETHER.has(char)) add('closed')
    else if (LIPS_ROUNDED.has(char)) add('round')
    else if (char <= 'z') add('mid')
    else add(ANY_LETTER[(char.codePointAt(0) ?? 0) % ANY_LETTER.length] ?? 'mid')
  }

  return shapes
}
