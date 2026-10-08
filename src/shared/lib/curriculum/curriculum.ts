/**
 * Shape of the course: 50 weeks in 10 sections of 5. Only the structure lives here; the
 * wording is in `texts/`, one file per language.
 */

export const SECTION_COUNT = 10
export const WEEKS_PER_SECTION = 5
export const WEEK_COUNT = SECTION_COUNT * WEEKS_PER_SECTION

/** Five core days and two flexible ones. TODO(lessons): what each day holds. */
export const DAYS_PER_WEEK = 7

export const OUTCOMES_PER_WEEK = 5

/** A week in three lines, as the journey lists it. */
export type WeekSummary = {
  /** The learner-facing goal, an "I can …" statement. */
  goal: string
  /** The real-life situation the week is set in. */
  context: string
  /** What the learner has to manage in that situation. */
  challenge: string
}

/** What a learner will be able to do by the end of a week; the last one sums the week up. */
export type WeekOutcomes = readonly [string, string, string, string, string]

/** What a learner works towards in one week. */
export type WeekText = WeekSummary & { outcomes: readonly string[] }

/** The whole course's wording in one language. */
export type CurriculumTexts = {
  /** Section names, Section 1 first. */
  sections: readonly string[]
  /** Weeks, Week 1 first. */
  weeks: readonly WeekText[]
}

export function isWeekNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= WEEK_COUNT
}

export function isDayNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= DAYS_PER_WEEK
}

export function isSectionNumber(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= SECTION_COUNT
}

/** The section a week belongs to (weeks 1–5 → 1, 6–10 → 2, …). */
export function sectionOfWeek(week: number): number {
  return Math.min(SECTION_COUNT, Math.max(1, Math.ceil(week / WEEKS_PER_SECTION)))
}

/** The week numbers of a section, in order. */
export function sectionWeeks(section: number): number[] {
  const first = (section - 1) * WEEKS_PER_SECTION + 1
  return Array.from({ length: WEEKS_PER_SECTION }, (_, index) => first + index)
}

/** The three lines of a week's summary, in the order they are shown. */
export const WEEK_TEXT_FIELDS = [
  'goal',
  'context',
  'challenge',
] as const satisfies readonly (keyof WeekSummary)[]
export type WeekTextField = (typeof WEEK_TEXT_FIELDS)[number]

/** Address of one text of the course: a section's name, or one part of a week. */
export type CurriculumKey =
  `section.${number}` | `week.${number}.${WeekTextField}` | `week.${number}.outcome.${number}`

export const sectionKey = (section: number): CurriculumKey => `section.${section}`
export const weekKey = (week: number, field: WeekTextField): CurriculumKey =>
  `week.${week}.${field}`
/** `position` is 1 to 5. */
export const outcomeKey = (week: number, position: number): CurriculumKey =>
  `week.${week}.outcome.${position}`

/** A week's texts: its summary, then its outcomes. */
export function weekTextKeys(week: number): CurriculumKey[] {
  return [
    ...WEEK_TEXT_FIELDS.map((field) => weekKey(week, field)),
    ...Array.from({ length: OUTCOMES_PER_WEEK }, (_, index) => outcomeKey(week, index + 1)),
  ]
}

/** A section's texts: its name, then each of its weeks' texts. */
export function sectionTextKeys(section: number): CurriculumKey[] {
  return [sectionKey(section), ...sectionWeeks(section).flatMap(weekTextKeys)]
}

/** Every text of the course, in course order. */
export const curriculumKeys: readonly CurriculumKey[] = Array.from(
  { length: SECTION_COUNT },
  (_, index) => sectionTextKeys(index + 1),
).flat()

const knownKeys = new Set<string>(curriculumKeys)

export function isCurriculumKey(value: string): value is CurriculumKey {
  return knownKeys.has(value)
}
