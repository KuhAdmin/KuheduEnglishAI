import { MAX_ROLEPLAY_TURNS, type WeekRoleplay } from '@/shared/lib/curriculum/weekRoleplays'
import { adminText } from '../adminText'

export type RoleplayTurnErrors = { partner?: string; reply?: string }

export type RoleplayValidation = {
  /** Problem with who the learner talks to. */
  partner?: string
  /** One entry per turn, in order; empty object when the turn is fine. */
  turns: RoleplayTurnErrors[]
  /** Problem with the turns as a whole. */
  list?: string
  valid: boolean
}

/** A week with no role-play at all: nothing to check, and nothing to store. */
export const isEmptyRoleplay = (roleplay: WeekRoleplay) =>
  roleplay.turns.length === 0 && !roleplay.partner.trim() && !roleplay.imageUrl

/**
 * Checks a week's role-play before it is saved. The settings schema would silently drop a turn
 * missing one of its lines, and a whole role-play without a partner or without turns; an admin
 * should instead be told what to fix.
 */
export function validateRoleplay(roleplay: WeekRoleplay): RoleplayValidation {
  const text = adminText.lessons
  const empty = isEmptyRoleplay(roleplay)

  const partner = !empty && !roleplay.partner.trim() ? text.errorPartnerName : undefined
  const turns = roleplay.turns.map((turn): RoleplayTurnErrors => {
    const errors: RoleplayTurnErrors = {}
    if (!turn.partner.trim()) errors.partner = text.errorPartnerLine
    if (!turn.reply.trim()) errors.reply = text.errorReply
    return errors
  })
  const list =
    roleplay.turns.length > MAX_ROLEPLAY_TURNS
      ? text.errorTooManyTurns
      : !empty && roleplay.turns.length === 0
        ? text.errorNoTurns
        : undefined

  return {
    partner,
    turns,
    list,
    valid: !partner && !list && turns.every((entry) => Object.keys(entry).length === 0),
  }
}
