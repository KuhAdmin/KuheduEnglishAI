import { z } from 'zod'
import {
  parseWeekContent,
  WEEK_CONTENT_KINDS,
  type WeekContentKind,
  type WeekContentOf,
} from '../content/lessons.ts'
import { COURSE_WEEKS } from './me.ts'

/**
 * A week's lesson content as the server keeps it: one piece per kind (`WEEK_CONTENT_KINDS`),
 * each as the app's own screens read it. Anyone may read a week; only an admin may save one.
 * What the server stores has been through `parseWeekContent`, so it is what the screens show.
 */

const week = z.number().int().min(1).max(COURSE_WEEKS)

/** A week in an address (`/api/lessons/weeks/12`). */
export const weekParamsSchema = z.object({ week: z.coerce.number().pipe(week) })

export const weekContentKindSchema = z.enum(WEEK_CONTENT_KINDS)

/** A week and a kind in an address (`/api/admin/lessons/weeks/12/dialogue`). */
export const weekContentParamsSchema = weekParamsSchema.extend({ kind: weekContentKindSchema })

/**
 * `GET /api/lessons/weeks/:week`, as the server answers it: every kind, `null` where nothing is
 * kept for the week (the app then shows what it has built in, or that there is nothing yet).
 */
export const weekLessonsResponseSchema = z.object({
  week,
  content: z.record(weekContentKindSchema, z.unknown().nullable()),
})

// The same answer as the app takes it: each piece read with the rules its screens are built on,
// so that a server older or newer than the app cannot hand a screen something it cannot show.
const kept = <Kind extends WeekContentKind>(kind: Kind) =>
  z
    .unknown()
    .transform((value): WeekContentOf[Kind] | null =>
      value === null || value === undefined ? null : parseWeekContent(kind, value),
    )

export const weekLessonsSchema = z.object({
  week,
  content: z.object({
    picture: kept('picture'),
    dialogue: kept('dialogue'),
    vocabulary: kept('vocabulary'),
    sentences: kept('sentences'),
    roleplay: kept('roleplay'),
    challenge: kept('challenge'),
    quiz: kept('quiz'),
    review_dialogue: kept('review_dialogue'),
    review_roleplay: kept('review_roleplay'),
    scenarios: kept('scenarios'),
  }),
})

export type WeekLessons = z.infer<typeof weekLessonsSchema>

/** A piece of content with the number of its save, which the next save must name. */
const storedPiece = z.object({
  week,
  kind: weekContentKindSchema,
  value: z.unknown(),
  version: z.number().int().min(1),
})

/** `GET /api/admin/lessons`: everything kept, for the editors to open with. */
export const storedLessonsSchema = z.object({ pieces: z.array(storedPiece) })

export type StoredLessons = z.infer<typeof storedLessonsSchema>

/**
 * `PUT /api/admin/lessons/weeks/:week/:kind`: the piece, and the version it was written from
 * (`0` when there was none). Another admin's save in between is not written over: 409.
 */
export const weekContentSaveSchema = z.object({
  value: z.unknown(),
  version: z.number().int().min(0),
})

export const weekContentSavedSchema = z.object({ version: z.number().int().min(1) })

/** `DELETE …`: the version being removed, by the same rule. */
export const weekContentRemoveSchema = z.object({ version: z.coerce.number().int().min(0) })
