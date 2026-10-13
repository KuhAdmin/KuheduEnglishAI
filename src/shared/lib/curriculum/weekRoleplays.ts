import { parseByWeek, parseRoleplay, type RoleplayTurn, type WeekRoleplay } from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { week1Roleplay } from './roleplays/week1'

// What a role-play is, how long it may be and how one is read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
// TODO(backend): a partner that listens and answers, in place of the script.
export {
  MAX_CUE_LENGTH,
  MAX_PARTNER_LENGTH,
  MAX_PARTNER_LINE_LENGTH,
  MAX_REPLY_LENGTH,
  MAX_ROLEPLAY_TURNS,
  parseRoleplay,
  type RoleplayTurn,
  type WeekRoleplay,
} from '@kuhedu/contracts'

/** Role-plays by week number. */
export type WeekRoleplays = Partial<Record<number, WeekRoleplay>>

/** The partner's picture is shown in a circle, about a third of a phone's width. */
export const ROLEPLAY_PICTURE_BOUNDS = { maxWidth: 320, maxHeight: 320 }

/** The role-plays that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekRoleplays: WeekRoleplays = { 1: week1Roleplay }

/** The two kinds of tutor, either of whom may play a partner. */
export type TutorKind = 'female' | 'male'

/** Who the learner talks to, when their tutor of this kind plays them. */
export const partnerNameFor = (roleplay: WeekRoleplay, kind: TutorKind): string =>
  (kind === 'female' ? roleplay.asWoman : roleplay.asMan) || roleplay.partner

/** Text to be found as it is written, whatever marks it holds. */
const literally = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A role-play as the learner's tutor plays it. The partner's lines are said in the tutor's voice
 * and from the tutor's face, so the partner is called what fits that tutor: in the heading, and
 * wherever a line says the name ("My name is Ravi" is "My name is Asha" from a woman). Only the
 * name as a whole word: a longer word that holds it is left alone.
 */
export function roleplayPlayedBy(roleplay: WeekRoleplay, kind: TutorKind): WeekRoleplay {
  const name = partnerNameFor(roleplay, kind)
  if (name === roleplay.partner) return roleplay

  const written = new RegExp(
    `(?<![\\p{L}\\p{N}])${literally(roleplay.partner)}(?![\\p{L}\\p{N}])`,
    'gu',
  )
  const named = (line: string) => line.replace(written, name)
  return {
    ...roleplay,
    partner: name,
    turns: roleplay.turns.map((turn) => ({
      ...turn,
      partner: named(turn.partner),
      reply: named(turn.reply),
    })),
  }
}

/**
 * Role-plays an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the turns
 * that have both of their lines, and the weeks that have a partner and at least one such turn;
 * drops everything else instead of failing.
 */
export const weekRoleplaysSchema = z
  .unknown()
  .transform((value): WeekRoleplays => parseByWeek(value, parseRoleplay))

export const defaultWeekRoleplays: WeekRoleplays = {}

export const WEEK_ROLEPLAYS_CONFIG_NAME = 'week-roleplays'

/** A week's role-play: the admin's if they wrote one, else the built-in one, else none. */
export function weekRoleplay(week: number, overrides: WeekRoleplays = {}): WeekRoleplay | null {
  return overrides[week] ?? builtInWeekRoleplays[week] ?? null
}

/**
 * What to say on a turn, in a learner's language (`bn-IN` falls back to `bn`), with the language
 * it is written in. `undefined` when it is not written in theirs.
 */
export function turnCue(
  turn: RoleplayTurn,
  language: string,
): { lang: string; text: string } | undefined {
  for (const lang of [language, primarySubtag(language)]) {
    const text = turn.cues[lang]
    if (text) return { lang, text }
  }
  return undefined
}

/** A week's role-play, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekRoleplay(week: number): WeekRoleplay | null {
  const overrides = useAppConfig({
    name: WEEK_ROLEPLAYS_CONFIG_NAME,
    schema: weekRoleplaysSchema,
    defaults: defaultWeekRoleplays,
  })
  return useMemo(() => weekRoleplay(week, overrides), [week, overrides])
}
