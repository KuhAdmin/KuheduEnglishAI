import { COURSE_WEEKS } from '../api/me.ts'
import { SPEECH_GENDERS, type SpeechGender } from '../api/speech.ts'
import {
  isRecord,
  isSafeAssetUrl,
  isSafeMediaUrl,
  tidy,
  tidyByLanguage,
  tidyList,
  tidyListByLanguage,
} from './text.ts'

/**
 * A week's lesson content, kind by kind: what each is, how long it may be, and how one week's
 * piece of it is read back from wherever it was kept. Written once, here, because the app reads
 * it (from its own storage, and from the server) and the server checks what an admin saves with
 * the very same rules: what is stored is what the screens will show.
 *
 * Every `parse…` answers `null` for something with nothing usable in it, and otherwise keeps
 * what is usable and drops the rest instead of failing.
 */

// ---------------------------------------------------------------------------------------------
// Day 1 (and the review's listening): a conversation
// ---------------------------------------------------------------------------------------------

/** One thing one person says. */
export type DialogueLine = {
  /** Who says it, as shown beside the line (a name or a role: "Asha", "Barista"). */
  speaker: string
  /** What they say, in English. */
  text: string
  /** The same in learners' languages, by language tag. A language may be missing. */
  translations: Record<string, string>
}

/**
 * Whether a speaker is a woman or a man, by the name beside their lines, so that "Asha" is read
 * in a woman's voice and "Ravi" in a man's whoever speaks first: the default voice of that kind.
 * A speaker who is not named here takes the tutors' voices by turn, as the speech module has it.
 */
export type SpeakerVoices = Record<string, SpeechGender>

/**
 * The short conversation a week opens with (Day 1, "Watch and listen"): the week's situation,
 * played out by two people.
 */
export type WeekDialogue = {
  /** A video of the conversation kept elsewhere; without one the app reads the lines aloud. */
  videoUrl: string | null
  /** In the order they are said. Never empty. */
  lines: DialogueLine[]
  /** Who of the speakers is a woman and who a man (see `SpeakerVoices`). Left out: nobody is. */
  voices?: SpeakerVoices
}

export const MAX_DIALOGUE_LINES = 16
export const MAX_SPEAKER_LENGTH = 30
export const MAX_LINE_LENGTH = 200
export const MAX_LINE_TRANSLATION_LENGTH = 300

function parseLine(value: unknown): DialogueLine | null {
  if (!isRecord(value)) return null
  const speaker = tidy(value.speaker, MAX_SPEAKER_LENGTH)
  const text = tidy(value.text, MAX_LINE_LENGTH)
  if (!speaker || !text) return null

  const translations = tidyByLanguage(value.translations, MAX_LINE_TRANSLATION_LENGTH)
  return { speaker, text, translations }
}

const isVoiceKind = (value: unknown): value is SpeechGender =>
  (SPEECH_GENDERS as readonly unknown[]).includes(value)

/** The names the lines are said under, each once, in the order they first speak. */
export function dialogueSpeakers(lines: readonly DialogueLine[]): string[] {
  const names = lines.map((line) => tidy(line.speaker, MAX_SPEAKER_LENGTH))
  return [...new Set(names)].filter((name) => name !== '')
}

/**
 * The voices of the people who speak in these lines, in the order they first speak. A voice
 * given to a name nobody speaks under is dropped, so it belongs to a name and goes with it.
 * `undefined` when none is left: a conversation without any reads back as it was written.
 */
export function speakerVoices(
  lines: readonly DialogueLine[],
  voices: unknown,
): SpeakerVoices | undefined {
  if (!isRecord(voices)) return undefined

  const kept: SpeakerVoices = {}
  for (const speaker of dialogueSpeakers(lines)) {
    const kind = Object.hasOwn(voices, speaker) ? voices[speaker] : undefined
    if (isVoiceKind(kind)) kept[speaker] = kind
  }
  return Object.keys(kept).length > 0 ? kept : undefined
}

/**
 * One conversation: the lines that have a speaker and a text, and the voices of those who speak
 * in them. `null` without any such line.
 */
export function parseWeekDialogue(value: unknown): WeekDialogue | null {
  if (!isRecord(value)) return null
  const lines = (Array.isArray(value.lines) ? value.lines : [])
    .map(parseLine)
    .filter((line) => line !== null)
    .slice(0, MAX_DIALOGUE_LINES)
  if (lines.length === 0) return null

  const videoUrl = typeof value.videoUrl === 'string' ? value.videoUrl.trim() : ''
  const voices = speakerVoices(lines, value.voices)
  return {
    videoUrl: isSafeMediaUrl(videoUrl) ? videoUrl : null,
    lines,
    ...(voices && { voices }),
  }
}

// ---------------------------------------------------------------------------------------------
// Day 2 (and the review's flashcards): words
// ---------------------------------------------------------------------------------------------

/** One word or short phrase to learn. */
export type VocabularyWord = {
  /** The word, in English, as the app's voice will say it. */
  word: string
  /** How it sounds, in phonetic spelling ("/ˈkɒfi/"). May be empty. */
  phonetic: string
  /** A picture of it; `null` shows a drawn stand-in. */
  imageUrl: string | null
  /** What it means in learners' languages, by language tag. A language may be missing. */
  meanings: Record<string, string>
  /**
   * The word in the parts it is said in, each as it is spelled, with letters that are not said
   * in brackets: "We(d)n(e)s", "day". Together they spell the word. Empty when not written.
   */
  syllables: string[]
  /** Which part is the strong one, counted from 1; `null` when none is marked. */
  stress: number | null
  /** Short tips on saying it, by language tag. English is what others fall back to. */
  tips: Record<string, string[]>
}

/** The words a week teaches (Day 2, "Learn useful words"). */
export type WeekVocabulary = {
  /** In the order they are shown. Never empty. */
  words: VocabularyWord[]
}

export const MAX_VOCABULARY_WORDS = 8
export const MAX_WORD_LENGTH = 40
export const MAX_PHONETIC_LENGTH = 60
export const MAX_MEANING_LENGTH = 60
export const MAX_SYLLABLES = 8
export const MAX_SYLLABLE_LENGTH = 16
export const MAX_WORD_TIPS = 3
export const MAX_WORD_TIP_LENGTH = 160

/** A run of letters in one part of a word: said, or written but not said. */
export type SyllableLetters = { text: string; silent: boolean }

/** One part of a word as its runs of letters: "by(e)" is "by", then an "e" that is not said. */
export const syllableLetters = (syllable: string): SyllableLetters[] =>
  syllable
    .split(/(\([^()]*\))/)
    .filter((run) => run !== '')
    .map((run) =>
      run.startsWith('(') ? { text: run.slice(1, -1), silent: true } : { text: run, silent: false },
    )

// Brackets in pairs, never nested or empty.
const WELL_FORMED_SYLLABLE = /^(?:[^()]|\([^()]+\))+$/

const lettersOf = (text: string) => text.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()

/**
 * Whether the parts are the word: each has something that is said, and together, brackets and
 * hyphens aside, they spell it letter for letter. Parts that do not would teach another word.
 */
export const syllablesSpell = (word: string, syllables: readonly string[]): boolean =>
  syllables.length > 0 &&
  syllables.every(
    (part) =>
      WELL_FORMED_SYLLABLE.test(part) &&
      syllableLetters(part).some((run) => !run.silent && lettersOf(run.text) !== ''),
  ) &&
  lettersOf(syllables.join('')) === lettersOf(word)

function parseWord(value: unknown): VocabularyWord | null {
  if (!isRecord(value)) return null
  const word = tidy(value.word, MAX_WORD_LENGTH)
  if (!word) return null

  const meanings = tidyByLanguage(value.meanings, MAX_MEANING_LENGTH)
  const imageUrl =
    typeof value.imageUrl === 'string' && isSafeAssetUrl(value.imageUrl) ? value.imageUrl : null
  const parts = tidyList(value.syllables, MAX_SYLLABLE_LENGTH, MAX_SYLLABLES)
  const syllables = syllablesSpell(word, parts) ? parts : []
  const { stress } = value
  return {
    word,
    phonetic: tidy(value.phonetic, MAX_PHONETIC_LENGTH),
    imageUrl,
    meanings,
    syllables,
    stress:
      typeof stress === 'number' &&
      Number.isInteger(stress) &&
      stress >= 1 &&
      stress <= syllables.length
        ? stress
        : null,
    tips: tidyListByLanguage(value.tips, MAX_WORD_TIP_LENGTH, MAX_WORD_TIPS),
  }
}

/** A week's words: the entries that have a word. `null` without any. */
export function parseWeekVocabulary(value: unknown): WeekVocabulary | null {
  if (!isRecord(value)) return null
  const words = (Array.isArray(value.words) ? value.words : [])
    .map(parseWord)
    .filter((word) => word !== null)
    .slice(0, MAX_VOCABULARY_WORDS)
  return words.length > 0 ? { words } : null
}

// ---------------------------------------------------------------------------------------------
// Day 3: sentences to put into English
// ---------------------------------------------------------------------------------------------

/** One sentence to put into English and then say. */
export type PracticeSentence = {
  /** The sentence in English: the answer, shown once the learner has tried or asked for it. */
  english: string
  /** Other English sentences that are just as right ("Hi! Good morning."). May be empty. */
  alsoAccepted: string[]
  /** The sentence in learners' languages, by language tag: what they translate from. */
  translations: Record<string, string>
  /** Short tips for getting to the English, by language tag. English is what others fall back to. */
  tips: Record<string, string[]>
}

/** The sentences a week practises (Day 3, "Translate and speak"). */
export type WeekSentences = {
  /** In the order they are shown, one at a time. Never empty. */
  sentences: PracticeSentence[]
}

export const MAX_SENTENCES = 6
export const MAX_ALSO_ACCEPTED = 4
export const MAX_TIPS = 3
export const MAX_SENTENCE_LENGTH = 120
export const MAX_SENTENCE_TRANSLATION_LENGTH = 200
export const MAX_TIP_LENGTH = 160

function parseSentence(value: unknown): PracticeSentence | null {
  if (!isRecord(value)) return null
  const english = tidy(value.english, MAX_SENTENCE_LENGTH)
  if (!english) return null

  return {
    english,
    alsoAccepted: tidyList(value.alsoAccepted, MAX_SENTENCE_LENGTH, MAX_ALSO_ACCEPTED),
    translations: tidyByLanguage(value.translations, MAX_SENTENCE_TRANSLATION_LENGTH),
    tips: tidyListByLanguage(value.tips, MAX_TIP_LENGTH, MAX_TIPS),
  }
}

/** A week's sentences: the entries that have an English sentence. `null` without any. */
export function parseWeekSentences(value: unknown): WeekSentences | null {
  if (!isRecord(value)) return null
  const sentences = (Array.isArray(value.sentences) ? value.sentences : [])
    .map(parseSentence)
    .filter((sentence) => sentence !== null)
    .slice(0, MAX_SENTENCES)
  return sentences.length > 0 ? { sentences } : null
}

// ---------------------------------------------------------------------------------------------
// Day 4 (and the review's and Day 7's): a role-play
// ---------------------------------------------------------------------------------------------

/** One exchange: the partner says something, the learner answers. */
export type RoleplayTurn = {
  /** What the partner says, in English, as the app's voice will say it. */
  partner: string
  /** A good answer, in English: shown as the last hint, and once the learner has answered. */
  reply: string
  /**
   * What the learner should say, told in their own language without the English words ("Tell
   * him your name"), by language tag: the first hint. A language may be missing.
   */
  cues: Record<string, string>
}

/**
 * The conversation a learner takes part in (Day 4): a partner whose lines are written, and what
 * the learner could answer to each. The partner always says the next line, whatever was said.
 */
export type WeekRoleplay = {
  /** Who the learner talks to, as it reads after "Talk to": "Ravi", "the barista". */
  partner: string
  /**
   * Their name when the learner's tutor, who plays them, is a woman, and when he is a man:
   * "Ravi" is "Asha" when a woman plays him. Left out, they are `partner` whoever plays them
   * (as "the barista" is, or "Sam").
   */
  asWoman?: string
  asMan?: string
  /** A picture of them; `null` shows the learner's tutor, who plays them. */
  imageUrl: string | null
  /** In the order they are taken. Never empty. */
  turns: RoleplayTurn[]
}

export const MAX_ROLEPLAY_TURNS = 8
export const MAX_PARTNER_LENGTH = 30
export const MAX_PARTNER_LINE_LENGTH = 200
export const MAX_REPLY_LENGTH = 120
export const MAX_CUE_LENGTH = 200

function parseTurn(value: unknown): RoleplayTurn | null {
  if (!isRecord(value)) return null
  const partner = tidy(value.partner, MAX_PARTNER_LINE_LENGTH)
  const reply = tidy(value.reply, MAX_REPLY_LENGTH)
  if (!partner || !reply) return null
  return { partner, reply, cues: tidyByLanguage(value.cues, MAX_CUE_LENGTH) }
}

/**
 * One role-play: the turns that have both of their lines, or `null` without a partner or
 * without any such turn.
 */
export function parseRoleplay(value: unknown): WeekRoleplay | null {
  if (!isRecord(value)) return null
  const partner = tidy(value.partner, MAX_PARTNER_LENGTH)
  const turns = (Array.isArray(value.turns) ? value.turns : [])
    .map(parseTurn)
    .filter((turn) => turn !== null)
    .slice(0, MAX_ROLEPLAY_TURNS)
  if (!partner || turns.length === 0) return null

  const imageUrl =
    typeof value.imageUrl === 'string' && isSafeAssetUrl(value.imageUrl) ? value.imageUrl : null
  const asWoman = tidy(value.asWoman, MAX_PARTNER_LENGTH)
  const asMan = tidy(value.asMan, MAX_PARTNER_LENGTH)
  // In this order, which is the order the built-in role-plays are written in.
  return { partner, ...(asWoman && { asWoman }), ...(asMan && { asMan }), imageUrl, turns }
}

// ---------------------------------------------------------------------------------------------
// Day 5 (and the review's speaking): the week's challenge
// ---------------------------------------------------------------------------------------------

/**
 * Something the learner is told, not something to practise: written in English and, where an
 * admin did so, in learners' languages by language tag.
 */
export type ChallengeText = {
  text: string
  translations: Record<string, string>
}

/**
 * The week's task done from start to finish in one go (Day 5): the learner reads what to do,
 * records themselves doing all of it, then listens back and ticks what they managed.
 */
export type WeekChallenge = {
  /** Its name, e.g. "Café challenge". */
  title: ChallengeText
  /** One sentence under the name; its text may be empty. */
  instruction: ChallengeText
  /** What to do, in the order to do it. Never empty. */
  tasks: ChallengeText[]
  /** Help the learner can ask for: English phrases that fit the task. May be empty. */
  phrases: string[]
}

export const MAX_CHALLENGE_TASKS = 6
export const MAX_CHALLENGE_PHRASES = 6
export const MAX_CHALLENGE_TITLE_LENGTH = 40
export const MAX_CHALLENGE_INSTRUCTION_LENGTH = 120
export const MAX_CHALLENGE_TASK_LENGTH = 80
export const MAX_CHALLENGE_PHRASE_LENGTH = 120
/** A translation may run longer than its English. */
export const translationLength = (max: number) => Math.round(max * 1.5)

/** One such text, as far as it is usable. */
export function parseChallengeText(value: unknown, max: number): ChallengeText {
  const given = isRecord(value) ? value : {}
  return {
    text: tidy(given.text, max),
    translations: tidyByLanguage(given.translations, translationLength(max)),
  }
}

/**
 * A week's challenge: the tasks that are written in English. `null` without a name or without
 * any such task.
 */
export function parseWeekChallenge(value: unknown): WeekChallenge | null {
  if (!isRecord(value)) return null
  const title = parseChallengeText(value.title, MAX_CHALLENGE_TITLE_LENGTH)
  const tasks = (Array.isArray(value.tasks) ? value.tasks : [])
    .map((task) => parseChallengeText(task, MAX_CHALLENGE_TASK_LENGTH))
    .filter((task) => task.text !== '')
    .slice(0, MAX_CHALLENGE_TASKS)
  if (!title.text || tasks.length === 0) return null

  return {
    title,
    instruction: parseChallengeText(value.instruction, MAX_CHALLENGE_INSTRUCTION_LENGTH),
    tasks,
    phrases: tidyList(value.phrases, MAX_CHALLENGE_PHRASE_LENGTH, MAX_CHALLENGE_PHRASES),
  }
}

// ---------------------------------------------------------------------------------------------
// Day 6: the review's quiz
// ---------------------------------------------------------------------------------------------

/** One question with one right answer. */
export type QuizQuestion = {
  /**
   * What is asked. An instruction, not English to practise, so the learner reads it in their own
   * language where it is written in it.
   */
  question: ChallengeText
  /** The right choice, in English. */
  answer: string
  /** The other choices, in English: at least one, none the same as the answer. */
  others: string[]
}

/** The short quiz of a week's review (Day 6): the week's words and expressions, to pick from. */
export type WeekQuiz = {
  /** In the order they are asked. Never empty. */
  questions: QuizQuestion[]
}

export const MAX_QUIZ_QUESTIONS = 8
/** Besides the answer, so a question has at most four choices: what fits a phone. */
export const MAX_QUIZ_OTHERS = 3
export const MAX_QUIZ_QUESTION_LENGTH = 120
export const MAX_QUIZ_CHOICE_LENGTH = 80

const comparable = (choice: string) => choice.trim().replace(/\s+/g, ' ').toLowerCase()

/** Two choices a learner could not tell apart. */
export const sameChoice = (a: string, b: string) => comparable(a) === comparable(b)

function parseQuestion(value: unknown): QuizQuestion | null {
  if (!isRecord(value)) return null
  const question = parseChallengeText(value.question, MAX_QUIZ_QUESTION_LENGTH)
  const answer = tidy(value.answer, MAX_QUIZ_CHOICE_LENGTH)
  if (!question.text || !answer) return null

  const others = tidyList(value.others, MAX_QUIZ_CHOICE_LENGTH, Infinity)
    // A choice written twice, or the answer written again, would be a second right answer.
    .filter(
      (choice, index, all) =>
        !sameChoice(choice, answer) &&
        all.findIndex((other) => sameChoice(other, choice)) === index,
    )
    .slice(0, MAX_QUIZ_OTHERS)
  return others.length > 0 ? { question, answer, others } : null
}

/**
 * A week's quiz: the questions that are asked in English and have an answer and another choice.
 * `null` without any.
 */
export function parseWeekQuiz(value: unknown): WeekQuiz | null {
  if (!isRecord(value)) return null
  const questions = (Array.isArray(value.questions) ? value.questions : [])
    .map(parseQuestion)
    .filter((question) => question !== null)
    .slice(0, MAX_QUIZ_QUESTIONS)
  return questions.length > 0 ? { questions } : null
}

// ---------------------------------------------------------------------------------------------
// Day 7: scenarios
// ---------------------------------------------------------------------------------------------

/** One situation to try the week's English in: somewhere new, with someone new. */
export type ChallengeScenario = {
  /**
   * What it is called where the learner picks it ("Takeaway café"). A label, not English to
   * practise, so they read it in their own language where it is written in it.
   */
  name: ChallengeText
  /** The conversation it is: a partner, and what is said turn by turn. */
  roleplay: WeekRoleplay
}

/**
 * The real-world challenge a week ends with (Day 7, optional): the week's conversation moved to
 * other places, for the learner to choose from and to take with as much help as they like.
 */
export type WeekScenarios = {
  /** In the order they are offered. Never empty. */
  scenarios: ChallengeScenario[]
}

/** As many as fit a phone's screen beside the levels without a second screen of choices. */
export const MAX_SCENARIOS = 3
export const MAX_SCENARIO_NAME_LENGTH = 24

function parseScenario(value: unknown): ChallengeScenario | null {
  if (!isRecord(value)) return null
  const name = parseChallengeText(value.name, MAX_SCENARIO_NAME_LENGTH)
  const roleplay = parseRoleplay(value.roleplay)
  return name.text && roleplay ? { name, roleplay } : null
}

/**
 * A week's scenarios: those that have an English name and a role-play that can be played.
 * `null` without any.
 */
export function parseWeekScenarios(value: unknown): WeekScenarios | null {
  if (!isRecord(value)) return null
  const scenarios = (Array.isArray(value.scenarios) ? value.scenarios : [])
    .map(parseScenario)
    .filter((scenario) => scenario !== null)
    .slice(0, MAX_SCENARIOS)
  return scenarios.length > 0 ? { scenarios } : null
}

// ---------------------------------------------------------------------------------------------
// The week's picture
// ---------------------------------------------------------------------------------------------

/** The picture of a week's real-life situation: a safe image source, or `null`. */
export const parseWeekPicture = (value: unknown): string | null =>
  typeof value === 'string' && isSafeAssetUrl(value) ? value : null

// ---------------------------------------------------------------------------------------------
// All of a week, by kind
// ---------------------------------------------------------------------------------------------

/** What a week has content of. The review's conversation and role-play are Day 1's and Day 4's kinds of thing. */
export const WEEK_CONTENT_KINDS = [
  'picture',
  'dialogue',
  'vocabulary',
  'sentences',
  'roleplay',
  'challenge',
  'quiz',
  'review_dialogue',
  'review_roleplay',
  'scenarios',
] as const

export type WeekContentKind = (typeof WEEK_CONTENT_KINDS)[number]

/** What one week holds of each kind. */
export type WeekContentOf = {
  picture: string
  dialogue: WeekDialogue
  vocabulary: WeekVocabulary
  sentences: WeekSentences
  roleplay: WeekRoleplay
  challenge: WeekChallenge
  quiz: WeekQuiz
  review_dialogue: WeekDialogue
  review_roleplay: WeekRoleplay
  scenarios: WeekScenarios
}

const PARSERS: { [Kind in WeekContentKind]: (value: unknown) => WeekContentOf[Kind] | null } = {
  picture: parseWeekPicture,
  dialogue: parseWeekDialogue,
  vocabulary: parseWeekVocabulary,
  sentences: parseWeekSentences,
  roleplay: parseRoleplay,
  challenge: parseWeekChallenge,
  quiz: parseWeekQuiz,
  review_dialogue: parseWeekDialogue,
  review_roleplay: parseRoleplay,
  scenarios: parseWeekScenarios,
}

/** One week's content of a kind, as far as it is usable; `null` when nothing of it is. */
export function parseWeekContent<Kind extends WeekContentKind>(
  kind: Kind,
  value: unknown,
): WeekContentOf[Kind] | null {
  return PARSERS[kind](value)
}

/** A week of the course, as a number. */
export const isCourseWeek = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= COURSE_WEEKS

/**
 * Content kept by week number (`{ 1: …, 12: … }`), as the app keeps each kind: the weeks that
 * exist and have something usable. A week written as "07" or "7.0" would be a second name for
 * week 7, and is turned away.
 */
export function parseByWeek<T>(
  value: unknown,
  parse: (entry: unknown) => T | null,
): Partial<Record<number, T>> {
  if (!isRecord(value)) return {}

  const byWeek: Partial<Record<number, T>> = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isCourseWeek(Number(week)) || String(Number(week)) !== week) continue
    const parsed = parse(entry)
    if (parsed !== null) byWeek[Number(week)] = parsed
  }
  return byWeek
}
