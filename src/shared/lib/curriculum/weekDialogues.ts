import {
  parseByWeek,
  parseWeekDialogue,
  type DialogueLine,
  type WeekDialogue,
} from '@kuhedu/contracts'
import { useMemo } from 'react'
import { z } from 'zod'
import { useAppConfig } from '../appConfig/useAppConfig'
import type { VoiceKind } from '../audio/voices'
import { primarySubtag } from '../i18n'
import { week1Dialogue } from './dialogues/week1'

// What a conversation is, how long it may be and how one is read back are written once, in
// `@kuhedu/contracts`: the server checks what an admin saves with the same rules.
export {
  dialogueSpeakers,
  MAX_DIALOGUE_LINES,
  MAX_LINE_LENGTH,
  MAX_LINE_TRANSLATION_LENGTH,
  MAX_SPEAKER_LENGTH,
  speakerVoices,
  type DialogueLine,
  type SpeakerVoices,
  type WeekDialogue,
} from '@kuhedu/contracts'

/** Conversations by week number. */
export type WeekDialogues = Partial<Record<number, WeekDialogue>>

/** The conversations that ship with the app. TODO(content): weeks 2 to 50. */
export const builtInWeekDialogues: WeekDialogues = { 1: week1Dialogue }

/** Whether this speaker is a woman or a man, if the conversation says. */
export function speakerVoice(dialogue: WeekDialogue, speaker: string): VoiceKind | undefined {
  const voices = dialogue.voices
  return voices && Object.hasOwn(voices, speaker) ? voices[speaker] : undefined
}

/**
 * Conversations an admin wrote or changed, by week; edited in Admin › Lessons. Keeps the lines
 * that have a speaker and a text, the weeks that have at least one such line, and the voices of
 * those who speak in them; drops everything else instead of failing.
 */
export const weekDialoguesSchema = z
  .unknown()
  .transform((value): WeekDialogues => parseByWeek(value, parseWeekDialogue))

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
