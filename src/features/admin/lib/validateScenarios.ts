import { MAX_SCENARIOS, type WeekScenarios } from '@/shared/lib/curriculum/weekScenarios'
import { adminText } from '../adminText'
import { isEmptyRoleplay, validateRoleplay, type RoleplayValidation } from './validateRoleplay'

export type ScenarioErrors = {
  /** Problem with the scenario's name. */
  name?: string
  /** What is wrong with its role-play, as Day 4's editor shows it. */
  roleplay: RoleplayValidation
}

export type ScenariosValidation = {
  /** One entry per scenario, in order. */
  scenarios: ScenarioErrors[]
  /** Problem with the list as a whole. */
  list?: string
  valid: boolean
}

/**
 * Checks a week's scenarios before they are saved. The settings schema would silently drop a
 * scenario without its English name or without a role-play that can be played; an admin should
 * instead be told what to fix. A week may have no role-play, but a scenario is one: an empty
 * one is unfinished, not absent.
 */
export function validateScenarios(content: WeekScenarios): ScenariosValidation {
  const text = adminText.lessons

  const scenarios = content.scenarios.map((scenario): ScenarioErrors => {
    const checked = validateRoleplay(scenario.roleplay)
    return {
      name: scenario.name.text.trim() ? undefined : text.errorScenarioName,
      roleplay: isEmptyRoleplay(scenario.roleplay)
        ? { ...checked, partner: text.errorPartnerName, list: text.errorNoTurns, valid: false }
        : checked,
    }
  })
  const list = content.scenarios.length > MAX_SCENARIOS ? text.errorTooManyScenarios : undefined

  return {
    scenarios,
    list,
    valid: !list && scenarios.every((entry) => !entry.name && entry.roleplay.valid),
  }
}
