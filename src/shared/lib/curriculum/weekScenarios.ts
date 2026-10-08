import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { isRecord } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Scenarios } from './scenarios/week1'
import { parseChallengeText, type ChallengeText } from './weekChallenges'
import { parseRoleplay, type WeekRoleplay } from './weekRoleplays'

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
 * TODO(backend): an open-ended conversation with a partner that listens, in place of the scripts.
 */
export type WeekScenarios = {
  /** In the order they are offered. Never empty. */
  scenarios: ChallengeScenario[]
}

/** Scenarios by week number. */
export type WeekScenariosByWeek = Partial<Record<number, WeekScenarios>>

/** As many as fit a phone's screen beside the levels without a second screen of choices. */
export const MAX_SCENARIOS = 3
export const MAX_SCENARIO_NAME_LENGTH = 24

/** How much help a challenge is taken with. Behaviour, not content: the same for every week. */
export const CHALLENGE_LEVELS = ['easier', 'standard', 'harder'] as const
export type ChallengeLevel = (typeof CHALLENGE_LEVELS)[number]
/** The one a learner starts on unless they choose another. */
export const DEFAULT_CHALLENGE_LEVEL: ChallengeLevel = 'standard'

export const isChallengeLevel = (value: unknown): value is ChallengeLevel =>
  CHALLENGE_LEVELS.some((level) => level === value)

/** The scenarios that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekScenarios: WeekScenariosByWeek = { 1: week1Scenarios }

function parseScenario(value: unknown): ChallengeScenario | null {
  if (!isRecord(value)) return null
  const name = parseChallengeText(value.name, MAX_SCENARIO_NAME_LENGTH)
  const roleplay = parseRoleplay(value.roleplay)
  return name.text && roleplay ? { name, roleplay } : null
}

/**
 * Scenarios an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the scenarios
 * that have an English name and a role-play that can be played, and the weeks that have at
 * least one; drops everything else instead of failing.
 */
export const weekScenariosSchema = z.unknown().transform((value): WeekScenariosByWeek => {
  if (!isRecord(value)) return {}

  const byWeek: WeekScenariosByWeek = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const scenarios = (Array.isArray(entry.scenarios) ? entry.scenarios : [])
      .map(parseScenario)
      .filter((scenario) => scenario !== null)
      .slice(0, MAX_SCENARIOS)
    if (scenarios.length > 0) byWeek[Number(week)] = { scenarios }
  }
  return byWeek
})

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
