import { useMemo } from 'react'
import { z } from 'zod'
import { isSafeMediaUrl } from '../appConfig/fields'
import { useAppConfig } from '../appConfig/useAppConfig'
import { primarySubtag } from '../i18n'
import { isRecord, tidy, tidyByLanguage } from './contentText'
import { isWeekNumber } from './curriculum'
import { week1Dialogue } from './dialogues/week1'

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
 * The short conversation a week opens with (Day 1, "Watch and listen"): the week's situation,
 * played out by two people.
 */
export type WeekDialogue = {
  /** A video of the conversation kept elsewhere; without one the device reads the lines aloud. */
  videoUrl: string | null
  /** In the order they are said. Never empty. */
  lines: DialogueLine[]
}

/** Conversations by week number. */
export type WeekDialogues = Partial<Record<number, WeekDialogue>>

export const MAX_DIALOGUE_LINES = 16
export const MAX_SPEAKER_LENGTH = 30
export const MAX_LINE_LENGTH = 200
export const MAX_LINE_TRANSLATION_LENGTH = 300

/** The conversations that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekDialogues: WeekDialogues = { 1: week1Dialogue }

function parseLine(value: unknown): DialogueLine | null {
  if (!isRecord(value)) return null
  const speaker = tidy(value.speaker, MAX_SPEAKER_LENGTH)
  const text = tidy(value.text, MAX_LINE_LENGTH)
  if (!speaker || !text) return null

  const translations = tidyByLanguage(value.translations, MAX_LINE_TRANSLATION_LENGTH)
  return { speaker, text, translations }
}

/**
 * Conversations an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the lines
 * that have a speaker and a text, and the weeks that have at least one such line; drops
 * everything else instead of failing.
 */
export const weekDialoguesSchema = z.unknown().transform((value): WeekDialogues => {
  if (!isRecord(value)) return {}

  const dialogues: WeekDialogues = {}
  for (const [week, entry] of Object.entries(value)) {
    if (!isWeekNumber(Number(week)) || String(Number(week)) !== week || !isRecord(entry)) continue
    const lines = (Array.isArray(entry.lines) ? entry.lines : [])
      .map(parseLine)
      .filter((line) => line !== null)
      .slice(0, MAX_DIALOGUE_LINES)
    if (lines.length === 0) continue

    const videoUrl = typeof entry.videoUrl === 'string' ? entry.videoUrl.trim() : ''
    dialogues[Number(week)] = { videoUrl: isSafeMediaUrl(videoUrl) ? videoUrl : null, lines }
  }
  return dialogues
})

export const defaultWeekDialogues: WeekDialogues = {}

export const WEEK_DIALOGUES_CONFIG_NAME = 'week-dialogues'

/** A week's conversation: the admin's if they wrote one, else the built-in one, else none. */
export function weekDialogue(week: number, overrides: WeekDialogues = {}): WeekDialogue | null {
  return overrides[week] ?? builtInWeekDialogues[week] ?? null
}

/** A line in a learner's language; a regional code (`bn-IN`) falls back to its base (`bn`). */
export function lineTranslation(line: DialogueLine, language: string): string | undefined {
  return line.translations[language] ?? line.translations[primarySubtag(language)]
}

/** A week's conversation, or `null` when it has none yet; follows an admin's edits live. */
export function useWeekDialogue(week: number): WeekDialogue | null {
  const overrides = useAppConfig({
    name: WEEK_DIALOGUES_CONFIG_NAME,
    schema: weekDialoguesSchema,
    defaults: defaultWeekDialogues,
  })
  return useMemo(() => weekDialogue(week, overrides), [week, overrides])
}
