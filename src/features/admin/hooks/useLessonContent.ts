import {
  builtInWeekChallenges,
  defaultWeekChallenges,
  WEEK_CHALLENGES_CONFIG_NAME,
  weekChallenge,
  weekChallengesSchema,
  type WeekChallenge,
  type WeekChallenges,
} from '@/shared/lib/curriculum/weekChallenges'
import {
  builtInWeekDialogues,
  defaultWeekDialogues,
  WEEK_DIALOGUES_CONFIG_NAME,
  weekDialogue,
  weekDialoguesSchema,
  type WeekDialogue,
  type WeekDialogues,
} from '@/shared/lib/curriculum/weekDialogues'
import {
  builtInWeekQuizzes,
  defaultWeekQuizzes,
  WEEK_QUIZZES_CONFIG_NAME,
  weekQuiz,
  weekQuizzesSchema,
  type WeekQuiz,
  type WeekQuizzes,
} from '@/shared/lib/curriculum/weekQuizzes'
import {
  builtInReviewDialogues,
  builtInReviewRoleplays,
  defaultReviewDialogues,
  defaultReviewRoleplays,
  reviewDialogue,
  reviewDialoguesSchema,
  reviewRoleplay,
  reviewRoleplaysSchema,
  WEEK_REVIEW_DIALOGUES_CONFIG_NAME,
  WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME,
} from '@/shared/lib/curriculum/weekReviews'
import {
  builtInWeekRoleplays,
  defaultWeekRoleplays,
  WEEK_ROLEPLAYS_CONFIG_NAME,
  weekRoleplay,
  weekRoleplaysSchema,
  type WeekRoleplay,
  type WeekRoleplays,
} from '@/shared/lib/curriculum/weekRoleplays'
import {
  builtInWeekScenarios,
  defaultWeekScenarios,
  WEEK_SCENARIOS_CONFIG_NAME,
  weekScenarios,
  weekScenariosSchema,
  type WeekScenarios,
  type WeekScenariosByWeek,
} from '@/shared/lib/curriculum/weekScenarios'
import {
  builtInWeekSentences,
  defaultWeekSentences,
  WEEK_SENTENCES_CONFIG_NAME,
  weekSentences,
  weekSentencesSchema,
  type WeekSentences,
  type WeekSentencesByWeek,
} from '@/shared/lib/curriculum/weekSentences'
import {
  builtInWeekVocabularies,
  defaultWeekVocabularies,
  WEEK_VOCABULARY_CONFIG_NAME,
  weekVocabulariesSchema,
  weekVocabulary,
  type WeekVocabularies,
  type WeekVocabulary,
} from '@/shared/lib/curriculum/weekVocabulary'
import { adminText } from '../adminText'
import { isEmptyChallenge, validateChallenge } from '../lib/validateChallenge'
import { validateDialogue } from '../lib/validateDialogue'
import { validateQuiz } from '../lib/validateQuiz'
import { validateScenarios } from '../lib/validateScenarios'
import { isEmptyRoleplay, validateRoleplay } from '../lib/validateRoleplay'
import { validateSentences } from '../lib/validateSentences'
import { validateVocabulary } from '../lib/validateVocabulary'
import { weekContentEditor } from '../lib/weekContent'
import { combineDrafts } from './combineDrafts'
import { useSettingsDraft } from './useSettingsDraft'

const text = adminText.lessons

/** The days of a week, each with a screen to fill. */
export const lessonDays = [
  { value: '1', label: text.dayWatch },
  { value: '2', label: text.dayWords },
  { value: '3', label: text.dayTranslate },
  { value: '4', label: text.dayTalk },
  { value: '5', label: text.dayPerform },
  { value: '6', label: text.dayReview },
  { value: '7', label: text.dayExtend },
] as const
export type LessonDay = (typeof lessonDays)[number]['value']

const noDialogue: WeekDialogue = { videoUrl: null, lines: [] }
const noVocabulary: WeekVocabulary = { words: [] }
const noSentences: WeekSentences = { sentences: [] }
const noRoleplay: WeekRoleplay = { partner: '', imageUrl: null, turns: [] }
const noQuiz: WeekQuiz = { questions: [] }
const noScenarios: WeekScenarios = { scenarios: [] }
const noChallenge: WeekChallenge = {
  title: { text: '', translations: {} },
  instruction: { text: '', translations: {} },
  tasks: [],
  phrases: [],
}

const counted = (count: number | undefined, unit: string, none: string) =>
  count ? `${count} ${unit}` : none

/** Whether what an admin wrote for a week (if anything) still has something to fix. */
const pending =
  <T>(draft: { value: Partial<Record<number, T>> }, validate: (content: T) => { valid: boolean }) =>
  (week: number) => {
    const written = draft.value[week]
    return written !== undefined && !validate(written).valid
  }

/**
 * Everything Admin › Lessons edits: one settings object per day (three for Day 6, whose review
 * has three parts written here), all behind one Save bar. For
 * the week on screen it gives each day's editor and what is wrong with its content; for any
 * week, whether a day is unfinished and how much of it there is. A new day is added here: its
 * draft, its editor, and an entry in each of the tables.
 */
export function useLessonContent(week: number) {
  const dialogues = useSettingsDraft<WeekDialogues>({
    name: WEEK_DIALOGUES_CONFIG_NAME,
    schema: weekDialoguesSchema,
    defaults: defaultWeekDialogues,
  })
  const vocabularies = useSettingsDraft<WeekVocabularies>({
    name: WEEK_VOCABULARY_CONFIG_NAME,
    schema: weekVocabulariesSchema,
    defaults: defaultWeekVocabularies,
  })
  const sentences = useSettingsDraft<WeekSentencesByWeek>({
    name: WEEK_SENTENCES_CONFIG_NAME,
    schema: weekSentencesSchema,
    defaults: defaultWeekSentences,
  })
  const roleplays = useSettingsDraft<WeekRoleplays>({
    name: WEEK_ROLEPLAYS_CONFIG_NAME,
    schema: weekRoleplaysSchema,
    defaults: defaultWeekRoleplays,
  })
  const challenges = useSettingsDraft<WeekChallenges>({
    name: WEEK_CHALLENGES_CONFIG_NAME,
    schema: weekChallengesSchema,
    defaults: defaultWeekChallenges,
  })
  const scenarios = useSettingsDraft<WeekScenariosByWeek>({
    name: WEEK_SCENARIOS_CONFIG_NAME,
    schema: weekScenariosSchema,
    defaults: defaultWeekScenarios,
  })
  const quizzes = useSettingsDraft<WeekQuizzes>({
    name: WEEK_QUIZZES_CONFIG_NAME,
    schema: weekQuizzesSchema,
    defaults: defaultWeekQuizzes,
  })
  const reviewDialogues = useSettingsDraft<WeekDialogues>({
    name: WEEK_REVIEW_DIALOGUES_CONFIG_NAME,
    schema: reviewDialoguesSchema,
    defaults: defaultReviewDialogues,
  })
  const reviewRoleplays = useSettingsDraft<WeekRoleplays>({
    name: WEEK_REVIEW_ROLEPLAYS_CONFIG_NAME,
    schema: reviewRoleplaysSchema,
    defaults: defaultReviewRoleplays,
  })

  const dialogue = weekContentEditor({
    draft: dialogues,
    week,
    builtIn: builtInWeekDialogues[week],
    empty: noDialogue,
    isEmpty: (content) => content.lines.length === 0 && !content.videoUrl,
  })
  const vocabulary = weekContentEditor({
    draft: vocabularies,
    week,
    builtIn: builtInWeekVocabularies[week],
    empty: noVocabulary,
    isEmpty: (content) => content.words.length === 0,
  })
  const sentence = weekContentEditor({
    draft: sentences,
    week,
    builtIn: builtInWeekSentences[week],
    empty: noSentences,
    isEmpty: (content) => content.sentences.length === 0,
  })
  const roleplay = weekContentEditor({
    draft: roleplays,
    week,
    builtIn: builtInWeekRoleplays[week],
    empty: noRoleplay,
    isEmpty: isEmptyRoleplay,
  })
  const challenge = weekContentEditor({
    draft: challenges,
    week,
    builtIn: builtInWeekChallenges[week],
    empty: noChallenge,
    isEmpty: isEmptyChallenge,
  })
  const scenario = weekContentEditor({
    draft: scenarios,
    week,
    builtIn: builtInWeekScenarios[week],
    empty: noScenarios,
    isEmpty: (content) => content.scenarios.length === 0,
  })
  const quiz = weekContentEditor({
    draft: quizzes,
    week,
    builtIn: builtInWeekQuizzes[week],
    empty: noQuiz,
    isEmpty: (content) => content.questions.length === 0,
  })
  // The review's conversation and role-play are edited like Day 1's and Day 4's.
  const listening = weekContentEditor({
    draft: reviewDialogues,
    week,
    builtIn: builtInReviewDialogues[week],
    empty: noDialogue,
    isEmpty: (content) => content.lines.length === 0 && !content.videoUrl,
  })
  const miniRoleplay = weekContentEditor({
    draft: reviewRoleplays,
    week,
    builtIn: builtInReviewRoleplays[week],
    empty: noRoleplay,
    isEmpty: isEmptyRoleplay,
  })

  const days = {
    dialogue: { editor: dialogue, validation: validateDialogue(dialogue.value) },
    vocabulary: { editor: vocabulary, validation: validateVocabulary(vocabulary.value) },
    sentences: { editor: sentence, validation: validateSentences(sentence.value) },
    roleplay: { editor: roleplay, validation: validateRoleplay(roleplay.value) },
    challenge: { editor: challenge, validation: validateChallenge(challenge.value) },
    scenarios: { editor: scenario, validation: validateScenarios(scenario.value) },
  }
  /** Day 6: the parts of the review that are written for it. */
  const review = {
    quiz: { editor: quiz, validation: validateQuiz(quiz.value) },
    listening: { editor: listening, validation: validateDialogue(listening.value) },
    roleplay: { editor: miniRoleplay, validation: validateRoleplay(miniRoleplay.value) },
  }

  const unfinished: Record<LessonDay, (week: number) => boolean> = {
    '1': pending(dialogues, validateDialogue),
    '2': pending(vocabularies, validateVocabulary),
    '3': pending(sentences, validateSentences),
    '4': pending(roleplays, validateRoleplay),
    '5': pending(challenges, validateChallenge),
    '6': (number) =>
      pending(quizzes, validateQuiz)(number) ||
      pending(reviewDialogues, validateDialogue)(number) ||
      pending(reviewRoleplays, validateRoleplay)(number),
    '7': pending(scenarios, validateScenarios),
  }

  const filled: Record<LessonDay, (week: number) => string> = {
    '1': (number) =>
      counted(weekDialogue(number, dialogues.value)?.lines.length, text.lines, text.noConversation),
    '2': (number) =>
      counted(
        weekVocabulary(number, vocabularies.value)?.words.length,
        text.wordCount,
        text.noWords,
      ),
    '3': (number) =>
      counted(
        weekSentences(number, sentences.value)?.sentences.length,
        text.sentenceCount,
        text.noSentences,
      ),
    '4': (number) =>
      counted(weekRoleplay(number, roleplays.value)?.turns.length, text.turnCount, text.noRoleplay),
    '5': (number) =>
      counted(
        weekChallenge(number, challenges.value)?.tasks.length,
        text.taskCount,
        text.noChallenge,
      ),
    '6': (number) =>
      counted(
        [
          weekQuiz(number, quizzes.value),
          reviewDialogue(number, reviewDialogues.value),
          reviewRoleplay(number, reviewRoleplays.value),
        ].filter((part) => part !== null).length,
        text.reviewPartCount,
        text.noReview,
      ),
    '7': (number) =>
      counted(
        weekScenarios(number, scenarios.value)?.scenarios.length,
        text.scenarioCount,
        text.noScenarios,
      ),
  }

  return {
    ...days,
    review,
    /** One Save / Discard / Reset for all of it. */
    drafts: combineDrafts(
      dialogues,
      vocabularies,
      sentences,
      roleplays,
      challenges,
      quizzes,
      reviewDialogues,
      reviewRoleplays,
      scenarios,
    ),
    /** Everything for the week on screen is fit to save. */
    valid: [...Object.values(days), ...Object.values(review)].every(
      (content) => content.validation.valid,
    ),
    /** Whether what an admin wrote for a day of a week still has something to fix. */
    unfinished,
    /** How much of a day a week has, in words, for the week picker. */
    filled,
  }
}
