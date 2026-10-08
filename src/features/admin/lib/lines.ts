/**
 * What is typed in a one-per-line field, as a list: cut to its limits as it is typed, the way
 * `maxLength` cuts a single text. Blank lines stay while typing; the settings schema drops them.
 */
export const toLines = (value: string, maxLines: number, maxLength: number): string[] =>
  value === ''
    ? []
    : value
        .split('\n')
        .slice(0, maxLines)
        .map((line) => line.slice(0, maxLength))

/** Sets or clears one language's entry, keeping the languages in the order the schema stores. */
export function withLanguage<T>(entries: Record<string, T>, code: string, entry: T | undefined) {
  const next = Object.entries(entries).filter(([language]) => language !== code)
  if (entry !== undefined) next.push([code, entry])
  // Sorted, so an undone edit leaves nothing to save.
  return Object.fromEntries(next.sort(([a], [b]) => a.localeCompare(b)))
}
