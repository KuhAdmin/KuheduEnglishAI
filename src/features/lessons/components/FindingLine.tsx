import type { PronunciationFinding } from '@kuhedu/contracts'
import type { ReactNode } from 'react'
import { fillText, formatNumber, useLanguage, useT, type Translate } from '@/shared/lib/i18n'
import { PartBeats } from './PartBeats'
import { StressComparison } from './StressComparison'

export type FindingLineProps = {
  /** One thing the server found in the recording, as a code. */
  finding: PronunciationFinding
  /** The word's parts, as a lesson writes them: "We(d)n(e)s", "day". Empty when not written. */
  syllables: readonly string[]
  /** What was said: one word (or a phrase learnt as one), or a sentence. */
  kind: SaidKind
}

/** What a recording is of. The texts differ: a sentence is not "the word". */
export type SaidKind = 'word' | 'sentence'

/** The words that sounded different, each in English, set into the sentence that names them. */
function nameWords(text: string, words: readonly string[]): ReactNode {
  const [before = '', after = ''] = text.split('{words}')
  return (
    <>
      {before}
      {words.map((word, place) => (
        <span key={word}>
          {place > 0 && ', '}
          <span lang="en" className="font-extrabold">
            {word}
          </span>
        </span>
      ))}
      {after}
    </>
  )
}

/** A part as the learner reads it in the word: its letters, said or not. */
const lettersOf = (syllable: string | undefined) => syllable?.replace(/[()]/g, '')

/** The numbers a finding came with, when it came with both. */
const numbersOf = ({ expected, heard }: PronunciationFinding) =>
  expected !== undefined && heard !== undefined ? { expected, heard } : null

/** What a finding says, in the screen's own texts: the server sends a code, never a sentence. */
function say(
  finding: PronunciationFinding,
  t: Translate,
  number: (value: number) => string,
  syllables: readonly string[],
  kind: SaidKind,
): ReactNode {
  const numbers = numbersOf(finding)
  const counts = numbers
    ? fillText(t('lessonDay.feedback.counts'), {
        expected: number(numbers.expected),
        heard: number(numbers.heard),
      })
    : null

  switch (finding.code) {
    case 'extraSyllable':
      return [t('lessonDay.feedback.extraSyllable'), counts].filter(Boolean).join(' ')
    case 'missingSyllable':
      return [t('lessonDay.feedback.missingSyllable'), counts].filter(Boolean).join(' ')
    case 'stressMoved': {
      const strongPart = lettersOf(syllables[(finding.expected ?? 0) - 1])
      if (!strongPart) return t('lessonDay.feedback.stressMoved')
      const [before = '', after = ''] = t('lessonDay.feedback.strongPart').split('{part}')
      return (
        <>
          {t('lessonDay.feedback.stressMoved')} {before}
          <span lang="en">{strongPart}</span>
          {after}
        </>
      )
    }
    case 'soundDiffers':
      // Which words, where the server could say: something a learner can go back to.
      if (finding.words) return nameWords(t('lessonDay.feedback.wordsDiffer'), finding.words)
      return t(
        kind === 'sentence'
          ? 'lessonDay.feedback.sentenceDiffers'
          : 'lessonDay.feedback.soundDiffers',
      )
    default:
      return null
  }
}

/**
 * What a finding looks like. Only where the numbers are there to draw from, and never more
 * than they say: which part was the extra one is not known, so no part of the word is marked.
 */
function draw(finding: PronunciationFinding, syllables: readonly string[]): ReactNode {
  const numbers = numbersOf(finding)
  if (!numbers) return null

  if (finding.code === 'extraSyllable' || finding.code === 'missingSyllable') {
    return <PartBeats expected={numbers.expected} heard={numbers.heard} />
  }
  const isPart = (place: number) => place >= 1 && place <= syllables.length
  if (finding.code === 'stressMoved' && isPart(numbers.expected) && isPart(numbers.heard)) {
    return (
      <StressComparison syllables={syllables} expected={numbers.expected} heard={numbers.heard} />
    )
  }
  return null
}

/**
 * One finding: what it says, and under that what it looks like. The sentence tells the learner
 * what to do; the drawing shows what they did, which the sentence leaves out.
 */
export function FindingLine({ finding, syllables, kind }: FindingLineProps) {
  const t = useT()
  const language = useLanguage()

  return (
    <div className="flex flex-col gap-2">
      <p>{say(finding, t, (value) => formatNumber(language, value), syllables, kind)}</p>
      {draw(finding, syllables)}
    </div>
  )
}
