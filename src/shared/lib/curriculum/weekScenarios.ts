import { parseByWeek, parseWeekScenarios, type WeekScenarios } from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { week1Scenarios } from './scenarios/week1'

// What a scenario is, how many a week may have and how they are read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
// TODO(backend): an open-ended conversation with a partner that listens, in place of the scripts.
export {
  MAX_SCENARIO_NAME_LENGTH,
  MAX_SCENARIOS,
  type ChallengeScenario,
  type WeekScenarios,
} from '@kuhedu/contracts'

/** Scenarios by week number. */
export type WeekScenariosByWeek = Partial<Record<number, WeekScenarios>>

/** How much help a challenge is taken with. Behaviour, not content: the same for every week. */
export const CHALLENGE_LEVELS = ['easier', 'standard', 'harder'] as const
export type ChallengeLevel = (typeof CHALLENGE_LEVELS)[number]
/** The one a learner starts on unless they choose another. */
export const DEFAULT_CHALLENGE_LEVEL: ChallengeLevel = 'standard'

export const isChallengeLevel = (value: unknown): value is ChallengeLevel =>
  CHALLENGE_LEVELS.some((level) => level === value)

/** The scenarios that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekScenarios: WeekScenariosByWeek = { 1: week1Scenarios }

/**
 * Scenarios an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the scenarios
 * that have an English name and a role-play that can be played, and the weeks that have at
 * least one; drops everything else instead of failing.
 */
export const weekScenariosSchema = z
  .unknown()
  .transform((value): WeekScenariosByWeek => parseByWeek(value, parseWeekScenarios))

export const defaultWeekScenarios: WeekScenariosByWeek = {}

export const WEEK_SCENARIOS_CONFIG_NAME = 'week-scenarios'

/** A week's scenarios: the admin's if they wrote some, else the built-in ones, else none. */
export function weekScenarios(
  week: number,
  overrides: WeekScenariosByWeek = {},
): WeekScenarios | null {
  return overrides[week] ?? builtInWeekScenarios[week] ?? null
}

/** A week's scenarios, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekScenarios(week: number): WeekScenarios | null {
  const overrides = useAppConfig({
    name: WEEK_SCENARIOS_CONFIG_NAME,
    schema: weekScenariosSchema,
    defaults: defaultWeekScenarios,
  })
  return useMemo(() => weekScenarios(week, overrides), [week, overrides])
}
