/**
 * A sentence as words, for comparing two of them. Pure: nothing here judges English, it only
 * says whether two sentences are the same words, and whether one is still the other.
 */

/** Ways of writing the same thing: a recogniser, a model and a lesson do not write it alike. */
const SAME_AS: [string, string][] = [
  ["i'm", 'i am'],
  ["you're", 'you are'],
  ["he's", 'he is'],
  ["she's", 'she is'],
  ["it's", 'it is'],
  ["we're", 'we are'],
  ["they're", 'they are'],
  ["that's", 'that is'],
  ["what's", 'what is'],
  ["isn't", 'is not'],
  ["aren't", 'are not'],
  ["don't", 'do not'],
  ["doesn't", 'does not'],
  ["can't", 'cannot'],
  ['can not', 'cannot'],
  ["i'll", 'i will'],
  ["i've", 'i have'],
  ['good bye', 'goodbye'],
  ['okay', 'ok'],
]

/** An apostrophe is written three ways, and they are one. */
const plainApostrophes = (text: string) => text.replace(/[’‘`]/g, "'")

/** The words of a sentence, whatever its capitals, its marks and its short forms. */
export function wordsOf(text: string): string[] {
  const letters = plainApostrophes(text)
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let plain = ` ${letters} `
  for (const [written, same] of SAME_AS) plain = plain.replaceAll(` ${written} `, ` ${same} `)
  return plain.trim().split(' ').filter(Boolean)
}

/** Whether two sentences are the same words. */
export const sameWords = (one: string, other: string) =>
  wordsOf(one).join(' ') === wordsOf(other).join(' ')

const NOT_A_NAME = new Set(['I', "I'm", "I'll", "I've", "I'd"])

/**
 * The words a recogniser wrote with a capital that do not open a sentence and are not "I":
 * somebody's name, a place, a day. It is how a name is told from a mistake.
 */
export function namesIn(text: string): string[] {
  const names = new Set<string>()
  for (const sentence of plainApostrophes(text).split(/[.!?]+/)) {
    for (const word of sentence.trim().split(/\s+/).slice(1)) {
      const bare = word.replace(/[^A-Za-z']/g, '')
      if (/^[A-Z]/.test(bare) && !NOT_A_NAME.has(bare)) names.add(bare)
    }
  }
  return [...names]
}

/** How many words a rewrite may add: "My name Sita" lacks one, "Me Rekha" two. */
const WORDS_ADDED_MAX = 3

/**
 * Whether a rewrite of what a learner said is still their sentence, and so may be shown to them
 * as a better way to say it. A model asked to correct a sentence sometimes answers it, shortens
 * it, or "corrects" a name it does not know ("Asha" to "ash"): then it is no correction.
 *
 * It must keep at least half of the learner's words, add only a few, and leave every name as it
 * was heard.
 */
export function stillTheirs(heard: string, rewrite: string): boolean {
  const said = wordsOf(heard)
  const better = wordsOf(rewrite)
  if (better.length === 0 || better.length > said.length + WORDS_ADDED_MAX) return false

  const left = [...better]
  let kept = 0
  for (const word of said) {
    const at = left.indexOf(word)
    if (at === -1) continue
    left.splice(at, 1)
    kept += 1
  }
  if (kept * 2 < said.length) return false

  const written = new Set(
    plainApostrophes(rewrite)
      .replace(/[^A-Za-z' ]/g, ' ')
      .split(/\s+/),
  )
  return namesIn(heard).every((name) => written.has(name))
}
