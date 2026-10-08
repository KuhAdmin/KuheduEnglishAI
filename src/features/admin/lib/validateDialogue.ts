import { isSafeMediaUrl } from '@/shared/lib/appConfig/fields'
import { MAX_DIALOGUE_LINES, type WeekDialogue } from '@/shared/lib/curriculum/weekDialogues'
import { adminText } from '../adminText'

export type DialogueLineErrors = { speaker?: string; text?: string }

export type DialogueValidation = {
  /** One entry per line, in order; empty object when the line is fine. */
  lines: DialogueLineErrors[]
  /** Problem with the video link. */
  video?: string
  /** Problem with the conversation as a whole. */
  list?: string
  valid: boolean
}

/**
 * Checks a week's conversation before it is saved. The settings schema would silently drop an
 * unfinished line, or the whole conversation; an admin should instead be told what to fix.
 */
export function validateDialogue(dialogue: WeekDialogue): DialogueValidation {
  const text = adminText.lessons

  const lines = dialogue.lines.map((line): DialogueLineErrors => {
    const errors: DialogueLineErrors = {}
    if (!line.speaker.trim()) errors.speaker = text.errorSpeaker
    if (!line.text.trim()) errors.text = text.errorText
    return errors
  })

  const video =
    dialogue.videoUrl?.trim() && !isSafeMediaUrl(dialogue.videoUrl.trim())
      ? text.errorVideo
      : undefined

  const list =
    dialogue.lines.length > MAX_DIALOGUE_LINES
      ? text.errorTooMany
      : dialogue.lines.length === 0 && dialogue.videoUrl?.trim()
        ? text.errorNoLines
        : undefined

  return {
    lines,
    video,
    list,
    valid: !video && !list && lines.every((line) => Object.keys(line).length === 0),
  }
}
