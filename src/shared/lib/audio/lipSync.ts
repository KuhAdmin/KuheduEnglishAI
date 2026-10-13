/**
 * The mouth of a drawn face while a text is said aloud. With each sound the server sends the
 * shapes of the lips through it and the moment each is taken (it knows: it decided how long every
 * sound of the sentence lasts before it made the speech), so a face follows what is heard.
 *
 * A sound that came without them (one kept from before they were sent) gets a mouth worked out
 * from the spelling and spread over its length. That reads as speech; it is not exact.
 */

import type { SpeechMouthMark, SpeechMouthShape } from '@kuhedu/contracts'

/**
 * `rest` is the mouth when nothing is being said. The others are shapes of speech: lips
 * `closed` (m, b, p, and a pause), nearly closed with the teeth showing (`mid`: every other
 * consonant), `open` (a, e), `wide` (i) and `round` (o, u, w).
 */
export type MouthShape = 'rest' | SpeechMouthShape

/** The lips take `shape` from `at` seconds into a sound, until the next mark. */
export type MouthMark = SpeechMouthMark

const VOWELS: Record<string, SpeechMouthShape> = {
  a: 'open',
  // Not the consonants' shape: the jaw opens on every vowel, or a word full of e is one still mouth.
  e: 'open',
  i: 'wide',
  o: 'round',
  u: 'round',
  y: 'wide',
}
const LIPS_TOGETHER = new Set(['m', 'b', 'p'])
const LIPS_ROUNDED = new Set(['w', 'q'])
// For a script there is no table for (Bengali, Devanagari): a letter always gets the same shape,
// so a sentence looks the same each time it is said.
const ANY_LETTER: SpeechMouthShape[] = ['open', 'mid', 'wide', 'round']

/** The shapes a mouth goes through to say a text, one after another, never the same one twice. */
export function mouthShapesFor(text: string): SpeechMouthShape[] {
  const shapes: SpeechMouthShape[] = []
  const add = (shape: SpeechMouthShape) => {
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

/** How long a guessed shape is held when the sound's length is not known: about one spoken sound. */
const GUESSED_SHAPE_SECONDS = 0.085

/**
 * A likely mouth for a sound that came without one: the shapes of its spelling, spread evenly
 * over its length (`seconds`; at a usual pace while the player does not know it yet).
 */
export function guessedMouth(text: string, seconds: number): MouthMark[] {
  const shapes = mouthShapesFor(text)
  // A text with no letters in it (a number) is still said.
  if (shapes.length === 0) return [{ at: 0, shape: 'mid' }]
  const each =
    Number.isFinite(seconds) && seconds > 0 ? seconds / shapes.length : GUESSED_SHAPE_SECONDS
  return shapes.map((shape, index) => ({ at: index * each, shape }))
}

/** The shape the lips have `seconds` into a sound: that of the last mark reached. */
export function mouthAt(marks: readonly MouthMark[], seconds: number): SpeechMouthShape {
  let low = 0
  let high = marks.length - 1
  let found: SpeechMouthShape = 'closed'
  while (low <= high) {
    const middle = (low + high) >> 1
    const mark = marks[middle]
    if (mark && mark.at <= seconds) {
      found = mark.shape
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return found
}
