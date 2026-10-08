import { describe, expect, it } from 'vitest'
import { builtInWeekDialogues, lineTranslation } from './weekDialogues'
import {
  builtInReviewDialogues,
  builtInReviewRoleplays,
  isReviewPart,
  REVIEW_PARTS,
  reviewDialogue,
  reviewDialoguesSchema,
  reviewPartsOf,
  reviewRoleplay,
  reviewRoleplaysSchema,
  type WeekReview,
} from './weekReviews'
import { builtInWeekRoleplays, turnCue } from './weekRoleplays'

const dialogue = {
  videoUrl: null,
  lines: [{ speaker: 'Barista', text: 'Hello!', translations: {} }],
}
const roleplay = {
  partner: 'the barista',
  imageUrl: null,
  turns: [{ partner: 'Hello!', reply: 'Hi!', cues: {} }],
}
const nothing: WeekReview = {
  quiz: null,
  listening: null,
  speaking: null,
  flashcards: null,
  roleplay: null,
}

describe('the parts of a review', () => {
  it('are listed in the order of the design', () => {
    expect(REVIEW_PARTS).toEqual(['quiz', 'listening', 'speaking', 'flashcards', 'roleplay'])
    expect(isReviewPart('flashcards')).toBe(true)
    expect(isReviewPart('nonsense')).toBe(false)
    expect(isReviewPart(null)).toBe(false)
  })

  it('are only those a week has something for', () => {
    expect(reviewPartsOf(nothing)).toEqual([])
    expect(reviewPartsOf({ ...nothing, roleplay, listening: dialogue })).toEqual([
      'listening',
      'roleplay',
    ])
  })
})

describe('the built-in review conversations', () => {
  it.each(Object.entries(builtInReviewDialogues))(
    'week %s is a conversation the schema would accept unchanged, key order included',
    (week, content) => {
      expect(JSON.stringify(reviewDialoguesSchema.parse({ [week]: content }))).toBe(
        JSON.stringify({ [week]: content }),
      )
      for (const line of content?.lines ?? []) {
        expect(lineTranslation(line, 'bn'), line.text).toBeTruthy()
        expect(lineTranslation(line, 'hi'), line.text).toBeTruthy()
      }
    },
  )

  it('are new to the learner: not the conversation the week opened with', () => {
    for (const [week, content] of Object.entries(builtInReviewDialogues)) {
      expect(content?.lines).not.toEqual(builtInWeekDialogues[Number(week)]?.lines)
    }
  })
})

describe('the built-in review role-plays', () => {
  it.each(Object.entries(builtInReviewRoleplays))(
    'week %s is a role-play the schema would accept unchanged, key order included',
    (week, content) => {
      expect(JSON.stringify(reviewRoleplaysSchema.parse({ [week]: content }))).toBe(
        JSON.stringify({ [week]: content }),
      )
      for (const turn of content?.turns ?? []) {
        expect(turnCue(turn, 'bn'), turn.partner).toMatchObject({ lang: 'bn' })
        expect(turnCue(turn, 'hi'), turn.partner).toMatchObject({ lang: 'hi' })
      }
    },
  )

  it('are shorter than the week’s own, with another partner', () => {
    for (const [week, content] of Object.entries(builtInReviewRoleplays)) {
      const first = builtInWeekRoleplays[Number(week)]
      expect(content?.partner).not.toBe(first?.partner)
      expect(content?.turns.length).toBeLessThan(first?.turns.length ?? 0)
    }
  })
})

describe('reviewDialogue and reviewRoleplay', () => {
  it('prefer what the admin wrote, then the built-in content, then none', () => {
    expect(reviewDialogue(1)).toBe(builtInReviewDialogues[1])
    expect(reviewDialogue(1, { 1: dialogue })).toBe(dialogue)
    expect(reviewDialogue(2)).toBeNull()

    expect(reviewRoleplay(1)).toBe(builtInReviewRoleplays[1])
    expect(reviewRoleplay(1, { 1: roleplay })).toBe(roleplay)
    expect(reviewRoleplay(2)).toBeNull()
  })
})
