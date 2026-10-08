/**
 * Telling whether a typed translation is one of the accepted English sentences. It is a plain
 * comparison done in the browser, not a judgement of the learner's English: a right sentence the
 * admin did not list is not recognised, which is why a miss is never called wrong.
 * TODO(backend): let the server judge a translation, so any right sentence counts.
 */

// Short forms and what they stand for, so "I'm fine" and "I am fine" are the same answer. The
// particular ones come first: the general rules after them would get these wrong.
const SHORT_FORMS: readonly (readonly [RegExp, string])[] = [
  [/\bcan't\b/g, 'can not'],
  [/\bcannot\b/g, 'can not'],
  [/\bwon't\b/g, 'will not'],
  [/\blet's\b/g, 'let us'],
  [/n't\b/g, ' not'],
  [/'m\b/g, ' am'],
  [/'re\b/g, ' are'],
  [/'ll\b/g, ' will'],
  [/'ve\b/g, ' have'],
  [/'d\b/g, ' would'],
  // Only after these words is "'s" a short "is"; elsewhere it marks whose something is.
  [/\b(he|she|it|that|what|where|who|how|there|here|name)'s\b/g, '$1 is'],
]

/** A sentence reduced to its words: no capitals, no punctuation, short forms written out. */
export function normaliseAnswer(text: string): string {
  // Phone keyboards type a curly apostrophe; the content may use either.
  let words = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
  for (const [short, full] of SHORT_FORMS) words = words.replace(short, full)
  return words
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when what was typed says the same, word for word, as one of the accepted sentences. */
export function matchesAnswer(typed: string, accepted: readonly string[]): boolean {
  const answer = normaliseAnswer(typed)
  return answer !== '' && accepted.some((sentence) => normaliseAnswer(sentence) === answer)
}
