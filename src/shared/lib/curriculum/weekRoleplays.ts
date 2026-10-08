import { useMemo } from 'react'
import { z } from 'zod'
import { isSafeAssetUrl } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { isRecord, tidy, tidyByLanguage } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Roleplay } from './roleplays/week1'

/** One exchange: the partner says something, the learner answers. */
export type RoleplayTurn = {
  /** What the partner says, in English, as the device's voice will say it. */
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
 * TODO(backend): a partner that listens and answers, in place of the script.
 */
export type WeekRoleplay = {
  /** Who the learner talks to, as it reads after "Talk to": "Ravi", "the barista". */
  partner: string
  /** A picture of them; `null` shows a drawn stand-in. */
  imageUrl: string | null
  /** In the order they are taken. Never empty. */
  turns: RoleplayTurn[]
}

/** Role-plays by week number. */
export type WeekRoleplays = Partial<Record<number, WeekRoleplay>>

export const MAX_ROLEPLAY_TURNS = 8
export const MAX_PARTNER_LENGTH = 30
export const MAX_PARTNER_LINE_LENGTH = 200
export const MAX_REPLY_LENGTH = 120
export const MAX_CUE_LENGTH = 200

/** The partner's picture is shown in a circle, about a third of a phone's width. */
export const ROLEPLAY_PICTURE_BOUNDS = { maxWidth: 320, maxHeight: 320 }

/** The role-plays that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekRoleplays: WeekRoleplays = { 1: week1Roleplay }

function parseTurn(value: unknown): RoleplayTurn | null {
  if (!isRecord(value)) return null
  const partner = tidy(value.partner, MAX_PARTNER_LINE_LENGTH)
  const reply = tidy(value.reply, MAX_REPLY_LENGTH)
  if (!partner || !reply) return null
  return { partner, reply, cues: tidyByLanguage(value.cues, MAX_CUE_LENGTH) }
}

/**
 * One role-play read back from settings storage, where anything may have been put: the turns
 * that have both of their lines, or `null` without a partner or without any such turn.
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
  return { partner, imageUrl, turns }
}

/**
 * Role-plays an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the turns
 * that have both of their lines, and the weeks that have a partner and at least one such turn;
 * drops everything else instead of failing.
 */
export const weekRoleplaysSchema = z.unknown().transform((value): WeekRoleplays => {
  if (!isRecord(value)) return {}

  const roleplays: WeekRoleplays = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week) continue
    const roleplay = parseRoleplay(entry)
    if (roleplay) roleplays[Number(week)] = roleplay
  }
  return roleplays
})

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
