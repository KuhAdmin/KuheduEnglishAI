import type { WeekOutcomes, WeekSummary, WeekText } from '../curriculum'

/** Pairs each week's summary with its outcomes, Week 1 first. */
export function withOutcomes(
  outcomes: readonly WeekOutcomes[],
  weeks: readonly WeekSummary[],
): WeekText[] {
  return weeks.map((week, index) => ({ ...week, outcomes: outcomes[index] ?? [] }))
}
