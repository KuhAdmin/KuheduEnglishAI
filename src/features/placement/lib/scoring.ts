import {
  LEVELS,
  UNDERSTAND_TYPES,
  type Level,
  type Skill,
  type Stage,
  type SupportLevel,
  type UnderstandType,
} from '../types'
import { estimateLevel, stageEvidence } from './engine'
import type { PlacementItem } from './itemSchema'
import type { PlacementResult, PlacementSession, SkillResult } from './sessionSchema'

/**
 * Turns a finished session into the learner's profile and starting point.
 * The numbers are for the learning engine, not for the learner: the result screen shows a
 * starting level and encouragement, never a score.
 */

const HIGH_DEPENDENCY = 0.5
const SOME_DEPENDENCY = 0.2

const ratio = (part: number, whole: number) => (whole === 0 ? null : part / whole)

function receptiveSkill(session: PlacementSession, stage: Stage): SkillResult {
  const estimate = estimateLevel(stageEvidence(session.responses, stage))
  return estimate
    ? { status: 'assessed', ...estimate }
    : { status: 'notAssessed', reason: session.notAssessed[stage] ?? 'audioUnavailable' }
}

export function buildResult(
  session: PlacementSession,
  bank: readonly PlacementItem[],
): PlacementResult {
  const { responses } = session
  const listening = receptiveSkill(session, 'LISTEN')
  const understanding = receptiveSkill(session, 'UNDERSTAND')
  // Recordings cannot be rated in the browser, so speaking never gets a level here — and a
  // missing level must never be read as a low one.
  const speaking: SkillResult = {
    status: 'notAssessed',
    reason: session.notAssessed.SPEAK ?? 'notScoredYet',
  }

  const typeOf = (itemId: string): UnderstandType | undefined => {
    const item = bank.find((entry) => entry.id === itemId)
    return item?.stage === 'UNDERSTAND' ? item.type : undefined
  }
  const understandBreakdown = Object.fromEntries(
    UNDERSTAND_TYPES.map((type) => {
      const answers = responses.filter((response) => typeOf(response.itemId) === type)
      return [
        type,
        {
          attempted: answers.length,
          correct: answers.filter((response) => response.correct).length,
        },
      ]
    }),
  ) as PlacementResult['profile']['understandBreakdown']

  // Questions the device could not play say nothing about how much help the learner needs.
  const answered = responses.filter(
    (response) => response.stage !== 'SPEAK' && response.skipped !== 'audioFailed',
  )
  const heard = answered.filter((response) => response.stage === 'LISTEN')
  const dependency = {
    translation: ratio(
      answered.filter((response) => response.translationUsed).length,
      answered.filter((response) => response.translationOffered).length,
    ),
    replay: ratio(
      heard.filter((response) => response.playCount > 1 || response.slowPlayCount > 0).length,
      heard.length,
    ),
    help: ratio(answered.filter((response) => response.helpOpened).length, answered.length),
  }

  const levels = [listening, understanding].flatMap((skill) =>
    skill.status === 'assessed' ? [LEVELS.indexOf(skill.level)] : [],
  )
  // Start where the weaker of the two is comfortable; nobody is placed above their evidence.
  const startLevel: Level = LEVELS[Math.min(...levels, LEVELS.length - 1)] ?? 'FOUNDATION'
  const noEvidence = levels.length === 0

  const heaviest = Math.max(dependency.translation ?? 0, dependency.help ?? 0)
  const supportLevel: SupportLevel =
    noEvidence || startLevel === 'FOUNDATION' || heaviest >= HIGH_DEPENDENCY
      ? 'HIGH'
      : heaviest >= SOME_DEPENDENCY || (dependency.replay ?? 0) >= HIGH_DEPENDENCY
        ? 'MEDIUM'
        : 'LOW'

  const prioritySkills: Skill[] = []
  if (listening.status === 'assessed' && understanding.status === 'assessed') {
    const gap = LEVELS.indexOf(listening.level) - LEVELS.indexOf(understanding.level)
    if (gap < 0) prioritySkills.push('listening')
    if (gap > 0) prioritySkills.push('understanding')
  }
  // Speaking is what the product is for, and it is the one skill not measured yet.
  prioritySkills.push('speaking')

  return {
    sessionId: session.id,
    version: session.version,
    completedAt: session.completedAt ?? session.updatedAt,
    profile: {
      listening,
      understanding,
      speaking,
      understandBreakdown,
      dependency,
      speakingAttempts: responses.filter(
        (response) => response.stage === 'SPEAK' && response.recordingAttempts > 0,
      ).length,
    },
    recommendation: {
      startLevel: noEvidence ? 'FOUNDATION' : startLevel,
      supportLevel,
      prioritySkills,
      provisional: [listening, understanding, speaking].some(
        (skill) => skill.status === 'notAssessed',
      ),
    },
  }
}
