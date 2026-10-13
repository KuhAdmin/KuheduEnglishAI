import { z } from 'zod'
import {
  placementResponseSchema,
  placementResultSchema,
  placementSessionSchema,
} from './placement.ts'
import { speechVoiceIdSchema } from './speech.ts'

/**
 * What is kept of a learner with their account (`/api/me`): what they chose (language, the look
 * of the app, the tutor and its voices, a photo), what they told the app about themselves, how
 * far they are in the lessons, and their placement test. The app keeps the same things in the
 * browser, in its stores; these are the shapes they travel in.
 */

/** The course's fixed size: 10 sections of 5 weeks, 7 days each. */
export const COURSE_WEEKS = 50
export const DAYS_PER_WEEK = 7

/** As the app's `ageGroups.ts` and `tutorAvatar.ts`: fixed in code, not admin settings. */
export const LEARNER_AGE_GROUPS = ['child', 'teen', 'adult'] as const
export const LEARNER_TUTOR_AVATARS = ['male', 'female'] as const

/** A language tag such as `bn`, `hi` or `en-IN`. */
export const LANGUAGE_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/
export const languageTagSchema = z.string().max(35).regex(LANGUAGE_TAG)

/**
 * The look of the app the learner chose: `auto`, or a theme's id. Checked for its form only,
 * because which themes exist is the app's to say; one it no longer has, it passes over.
 */
export const themePreferenceSchema = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/)

/** The most languages a learner can have chosen voices for. */
const VOICED_LANGUAGES_MAX = 30

/** The voice chosen for each kind of tutor, by base language (`en`, `hi`), as its id. */
export const learnerVoicesSchema = z
  .record(
    z.string().regex(/^[a-z]{2,3}$/),
    z.object({ female: speechVoiceIdSchema.optional(), male: speechVoiceIdSchema.optional() }),
  )
  .refine((voices) => Object.keys(voices).length <= VOICED_LANGUAGES_MAX)

export type LearnerVoices = z.infer<typeof learnerVoicesSchema>

/** Each answer is `null` until it is given; the app then shows its default. */
export const learnerProfileSchema = z.object({
  language: languageTagSchema.nullable(),
  ageGroup: z.enum(LEARNER_AGE_GROUPS).nullable(),
  tutorAvatar: z.enum(LEARNER_TUTOR_AVATARS).nullable(),
  theme: themePreferenceSchema.nullable(),
  voices: learnerVoicesSchema,
  /**
   * When their photo was last saved, or `null` without one. The photo itself is asked for apart
   * (`GET /api/me/photo`), and only by a browser whose own copy is older.
   */
  photoUpdatedAt: z.string().nullable(),
})

export type LearnerProfile = z.infer<typeof learnerProfileSchema>

/** `PATCH /api/me/profile`: any of the answers; one left out is left as it is. */
export const learnerProfilePatchSchema = learnerProfileSchema
  .omit({ photoUpdatedAt: true })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0)

export type LearnerProfilePatch = z.infer<typeof learnerProfilePatchSchema>

/**
 * A learner's own photo, as the app makes it: shrunk and re-encoded in the browser, as a `data:`
 * URL. Larger than this is not kept with the account.
 */
export const LEARNER_PHOTO_MAX = 700_000
export const learnerPhotoSchema = z.object({
  photo: z
    .string()
    .max(LEARNER_PHOTO_MAX)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/),
})

export type LearnerPhoto = z.infer<typeof learnerPhotoSchema>

/** `PUT /api/me/photo`. */
export const learnerPhotoSavedSchema = z.object({ photoUpdatedAt: z.string() })

/**
 * What a learner can have done in a week: heard its opening conversation through, finished a
 * day, done a part of the review (Day 6), taken a scenario of the challenge (Day 7) to its end.
 */
export const LESSON_MARK_KINDS = ['heard', 'day', 'review_part', 'scenario'] as const
export type LessonMarkKind = (typeof LESSON_MARK_KINDS)[number]
/** As `REVIEW_PARTS` in the app's `weekReviews.ts`. */
export const LESSON_REVIEW_PARTS = [
  'quiz',
  'listening',
  'speaking',
  'flashcards',
  'roleplay',
] as const
/** As `MAX_SCENARIOS` in the app's `weekScenarios.ts`. */
export const LESSON_SCENARIOS_MAX = 3

const week = z.number().int().min(1).max(COURSE_WEEKS)
const day = z.number().int().min(1).max(DAYS_PER_WEEK)
/** A scenario is marked by its place in the week's list, from 0, as the app's store keeps it. */
const scenarioPlace = z
  .number()
  .int()
  .min(0)
  .max(LESSON_SCENARIOS_MAX - 1)

/** Which one a mark is for, as text: the day, the part's name, the scenario's place; none for `heard`. */
export function isLessonMarkRef(kind: LessonMarkKind, ref: string): boolean {
  if (kind === 'heard') return ref === ''
  if (kind === 'review_part') return (LESSON_REVIEW_PARTS as readonly string[]).includes(ref)
  if (!/^\d$/.test(ref)) return false
  return (kind === 'day' ? day : scenarioPlace).safeParse(Number(ref)).success
}

/** One thing done. Marks are only ever added: one sent twice changes nothing. */
export const lessonMarkSchema = z
  .object({ week, kind: z.enum(LESSON_MARK_KINDS), ref: z.string().max(20) })
  .refine(({ kind, ref }) => isLessonMarkRef(kind, ref))

export type LessonMark = z.infer<typeof lessonMarkSchema>

/** The most marks sent in one go; a whole course is a few hundred. */
export const LESSON_MARKS_MAX = 200

/** `POST /api/me/progress/marks`. */
export const lessonMarksRequestSchema = z.object({
  marks: z.array(lessonMarkSchema).min(1).max(LESSON_MARKS_MAX),
})

/**
 * Lesson progress as the app's store keeps it: by week number, which as an object's key is text.
 */
export const lessonProgressSchema = z.object({
  heardWeeks: z.array(week),
  doneDays: z.record(z.string(), z.array(day)),
  reviewParts: z.record(z.string(), z.array(z.enum(LESSON_REVIEW_PARTS))),
  scenariosDone: z.record(z.string(), z.array(scenarioPlace)),
})

export type LessonProgress = z.infer<typeof lessonProgressSchema>

// What the server takes of a test is the app's own shape, with the limits a stored thing needs.
const instant = z.iso.datetime()
const shortId = z.string().regex(/^[A-Za-z0-9._-]{1,80}$/)
/** A stage is four to seven questions; this is room for a few tests' worth. */
const PLACEMENT_RESPONSES_MAX = 100

/** The id the app gives a test, e.g. `PL-20261007-8F42A`. */
export const placementClientIdSchema = z.string().regex(/^[A-Za-z0-9-]{1,40}$/)

/** `PUT /api/me/placement/sessions/:clientId`: the test as it stands, and its result once finished. */
export const placementSaveSchema = z.object({
  session: placementSessionSchema.extend({
    id: placementClientIdSchema,
    version: shortId,
    startedAt: instant,
    updatedAt: instant,
    completedAt: instant.nullable(),
    languageSupport: languageTagSchema,
    currentItemId: shortId.nullable(),
    responses: z
      .array(placementResponseSchema.extend({ itemId: shortId, answeredAt: instant }))
      .max(PLACEMENT_RESPONSES_MAX),
  }),
  result: placementResultSchema
    .extend({ sessionId: placementClientIdSchema, version: shortId, completedAt: instant })
    .nullable(),
})

export type PlacementSave = z.infer<typeof placementSaveSchema>

/** The learner's latest test and its outcome, or `null`s before one. */
export const learnerPlacementSchema = z.object({
  session: placementSessionSchema.nullable(),
  result: placementResultSchema.nullable(),
})

export type LearnerPlacement = z.infer<typeof learnerPlacementSchema>

/** `GET /api/me`: everything kept of the learner but their photo. */
export const learnerDataSchema = z.object({
  profile: learnerProfileSchema,
  progress: lessonProgressSchema,
  placement: learnerPlacementSchema,
})

export type LearnerData = z.infer<typeof learnerDataSchema>
